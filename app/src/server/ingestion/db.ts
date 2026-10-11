import pg from "pg";
import { getTableColumns, getTableName, type Table } from "drizzle-orm";

// Ingestion uses node-postgres over a direct connection: it needs multi-row
// statements and multi-statement work that neon-http isn't suited to.
export function ingestionDatabaseUrl(): string {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL_UNPOOLED or DATABASE_URL must be set");
  return url;
}

let pool: pg.Pool | undefined;

export function getPool(): pg.Pool {
  pool ??= new pg.Pool({ connectionString: ingestionDatabaseUrl(), max: 3 });
  return pool;
}

export async function closePool(): Promise<void> {
  await pool?.end();
  pool = undefined;
}

export type Queryable = Pick<pg.Pool | pg.PoolClient, "query">;

export const quoteIdent = (name: string) => `"${name.replace(/"/g, '""')}"`;

// Insert row for upserts. Numeric columns may carry exact decimal text
// (importers avoid float round-trips); Postgres parses it as numeric.
export type UpsertRow<T extends Table> = {
  [K in keyof T["$inferInsert"]]?: T["$inferInsert"][K] | string | null;
};

export interface UpsertOptions<T extends Table> {
  // TS keys of the conflict target (a unique index or constraint).
  conflict: (keyof T["$inferInsert"] & string)[];
  // Columns to update on conflict. Defaults to every inserted non-conflict column.
  update?: (keyof T["$inferInsert"] & string)[];
  // Raw SQL per DB column, overriding `excluded.<col>` in the update.
  updateExpressions?: Record<string, string>;
  // Timestamp column (DB name) set to now() when a row changes. Defaults to
  // updated_at when the table has one.
  touch?: string;
  batchSize?: number;
}

// Batched INSERT ... ON CONFLICT DO UPDATE that only rewrites rows whose values
// changed, and bumps updated_at (when the table has one) only for those rows.
// Returns the number of rows inserted or changed.
export async function upsert<T extends Table>(
  db: Queryable,
  table: T,
  rows: UpsertRow<T>[],
  options: UpsertOptions<T>,
): Promise<number> {
  if (rows.length === 0) return 0;
  const columns = getTableColumns(table) as Record<string, { name: string }>;
  const tableName = quoteIdent(getTableName(table));
  const dbName = (key: string) => {
    const column = columns[key];
    if (!column) throw new Error(`${getTableName(table)} has no column ${key}`);
    return column.name;
  };

  const keys = Object.keys(rows[0]);
  const conflictKeys = new Set<string>(options.conflict);
  const updateKeys = options.update ?? keys.filter((k) => !conflictKeys.has(k));
  const touch = options.touch ?? ("updatedAt" in columns ? "updated_at" : undefined);

  const insertCols = keys.map((k) => quoteIdent(dbName(k)));
  const assignments = updateKeys.map((k) => {
    const col = dbName(k);
    return `${quoteIdent(col)} = ${options.updateExpressions?.[col] ?? `EXCLUDED.${quoteIdent(col)}`}`;
  });
  if (touch && !keys.some((k) => dbName(k) === touch)) assignments.push(`${quoteIdent(touch)} = now()`);
  const compareCols = updateKeys.map((k) => quoteIdent(dbName(k)));
  const targetValues = compareCols.map((c) => `${tableName}.${c}`);
  const newValues = updateKeys.map((k) => {
    const col = dbName(k);
    return options.updateExpressions?.[col] ?? `EXCLUDED.${quoteIdent(col)}`;
  });

  const conflictSql = options.conflict.map((k) => quoteIdent(dbName(k))).join(", ");
  const onConflict =
    updateKeys.length === 0
      ? `ON CONFLICT (${conflictSql}) DO NOTHING`
      : `ON CONFLICT (${conflictSql}) DO UPDATE SET ${assignments.join(", ")}
         WHERE (${targetValues.join(", ")}) IS DISTINCT FROM (${newValues.join(", ")})`;

  const text = `
    INSERT INTO ${tableName} (${insertCols.join(", ")})
    SELECT ${insertCols.join(", ")} FROM json_populate_recordset(NULL::${tableName}, $1::json)
    ${onConflict}
    RETURNING 1`;

  // ON CONFLICT can't touch the same row twice in one statement: last row wins.
  const unique = new Map<string, Record<string, unknown>>();
  for (const row of rows as Record<string, unknown>[]) {
    unique.set(JSON.stringify(options.conflict.map((k) => row[k] ?? null)), row);
  }

  const batchSize = options.batchSize ?? 1000;
  const deduped = [...unique.values()];
  let written = 0;
  for (let i = 0; i < deduped.length; i += batchSize) {
    const batch = deduped.slice(i, i + batchSize).map((row) => {
      const out: Record<string, unknown> = {};
      for (const k of keys) out[dbName(k)] = row[k] ?? null;
      return out;
    });
    const result = await db.query(text, [JSON.stringify(batch)]);
    written += result.rowCount ?? 0;
  }
  return written;
}
