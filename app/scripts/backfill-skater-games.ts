// Fills skater_games (per-game Game Score) for every final game of a season,
// in batches until none are left. Three sequential NHL requests per game.
//
//   npx tsx scripts/backfill-skater-games.ts [--season 2026]
//
// Uses DATABASE_URL_UNPOOLED (direct), else DATABASE_URL.
import { parseArgs } from "node:util";
import { config } from "dotenv";

config({ path: [".env.local", "../.env.local"], quiet: true });

const { closePool, getPool } = await import("@/server/ingestion/db");
const { currentSeason } = await import("@/server/ingestion/normalize");
const { syncSkaterGames } = await import("@/server/ingestion/steps");

const { values } = parseArgs({ options: { season: { type: "string" } } });
const season = values.season ? Number(values.season) : currentSeason();
const db = getPool();
try {
  // One pass over every final game; games without shifts stay for the cron.
  await syncSkaterGames(db, season, 5000);
} finally {
  await closePool();
}
