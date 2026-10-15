// Runs today's playoff odds simulation and stores it (what the projections
// cron does).
//
//   npx tsx scripts/run-projections.ts [--season 2026]
//
// Uses DATABASE_URL_UNPOOLED (direct), else DATABASE_URL.
import { parseArgs } from "node:util";
import { config } from "dotenv";

config({ path: [".env.local", "../.env.local"], quiet: true });

const { closePool, getPool } = await import("@/server/ingestion/db");
const { currentSeason } = await import("@/server/ingestion/normalize");
const { syncProjections } = await import("@/server/ingestion/steps");

const { values } = parseArgs({ options: { season: { type: "string" } } });
const db = getPool();
try {
  await syncProjections(db, values.season ? Number(values.season) : currentSeason());
} finally {
  await closePool();
}
