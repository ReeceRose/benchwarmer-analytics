import { neon } from "@neondatabase/serverless";
import type { SQL } from "drizzle-orm";
import { drizzle as drizzleNeonHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzleNodePg } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import pg from "pg";
import * as schema from "@/server/db/schema";

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

let instance: Database | undefined;

// Neon (pooled DATABASE_URL) is reached over HTTP via neon-http, which suits
// serverless request handlers. A plain local Postgres (e.g. the throwaway
// docker DB used in development) can't speak that protocol, so use node-postgres.
function createDb(): Database {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  if (LOCAL_HOSTS.has(new URL(url).hostname)) {
    return drizzleNodePg(new pg.Pool({ connectionString: url, max: 5 }), { schema });
  }
  return drizzleNeonHttp(neon(url), { schema });
}

// Lazily created so importing this module (e.g. during build) does not
// require DATABASE_URL to be present.
export function getDb(): Database {
  instance ??= createDb();
  return instance;
}

// Raw SQL rows. Both drivers return `{ rows }`, but PgDatabase's generic
// execute() type can't express that. Note numeric/bigint arrive as strings.
export async function queryRows<T>(db: Database, query: SQL): Promise<T[]> {
  const result = (await db.execute(query)) as unknown as { rows: T[] };
  return result.rows;
}
