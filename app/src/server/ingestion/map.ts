import { getTableColumns, type Table } from "drizzle-orm";
import type { UpsertRow } from "@/server/ingestion/db";
import type { FieldSpec, ParsedRecord } from "@/server/ingestion/csv";
import { truncInt } from "@/server/ingestion/normalize";

type Value = string | number | boolean | null;
type Convert = (value: string | number | null) => Value;

const isZero = (value: string | number) => Number(value) === 0;

// Conversion for a same-named source field, matching the C# importers:
// (int)decimal truncates, `decimal != 0` becomes a bool, `X.HasValue ? ... : null`
// keeps nulls, and decimals pass through as exact text.
function converterFor(field: FieldSpec, columnType: string, notNull: boolean, key: string): Convert {
  const nullableSource = field.type.endsWith("?");
  const nullGuard = (convert: (value: string | number) => Value): Convert => (value) => {
    if (value === null) {
      if (notNull) throw new Error(`${key}: null for non-null column`);
      return null;
    }
    return convert(value);
  };
  switch (columnType) {
    case "PgInteger":
    case "PgBigInt53":
      return nullGuard((v) => truncInt(v));
    case "PgBoolean":
      return nullGuard((v) => !isZero(v));
    case "PgNumeric":
    case "PgNumericNumber":
      return nullGuard((v) => (typeof v === "number" ? String(v) : v));
    case "PgText":
      return nullGuard((v) => String(v));
    default:
      throw new Error(`${key}: unsupported column type ${columnType} (source ${field.type}, nullable ${nullableSource})`);
  }
}

export interface MapperOptions<R> {
  // Table keys filled by the caller (keys, normalized values, derived stats).
  computed: Record<string, (record: R) => Value>;
  // Table keys left to database defaults (id, created_at, ...).
  skip?: string[];
}

// Builds a record → row mapper that copies every same-named field into the
// table, using `computed` for the exceptions. Throws at build time if a table
// column has neither a source field nor a computed value.
export function buildMapper<T extends Table, F extends readonly FieldSpec[]>(
  table: T,
  fields: F,
  options: MapperOptions<ParsedRecord<F>>,
): (record: ParsedRecord<F>) => UpsertRow<T> {
  const columns = getTableColumns(table) as Record<string, { columnType: string; notNull: boolean }>;
  const byKey = new Map(fields.map((f) => [f.key, f]));
  const skip = new Set(["id", "createdAt", "updatedAt", ...(options.skip ?? [])]);
  const plan: [string, Convert | null, ((record: ParsedRecord<F>) => Value) | null][] = [];

  for (const [key, column] of Object.entries(columns)) {
    if (skip.has(key)) continue;
    const computed = options.computed[key];
    if (computed) {
      plan.push([key, null, computed]);
      continue;
    }
    const field = byKey.get(key);
    if (!field) throw new Error(`no source field for column ${key}`);
    plan.push([key, converterFor(field, column.columnType, column.notNull, key), null]);
  }
  for (const key of Object.keys(options.computed)) {
    if (!(key in columns)) throw new Error(`computed key ${key} is not a column`);
  }

  return (record) => {
    const row: Record<string, Value> = {};
    const source = record as Record<string, string | number | null>;
    for (const [key, convert, computed] of plan) {
      row[key] = computed ? computed(record) : convert!(source[key]);
    }
    return row as UpsertRow<T>;
  };
}
