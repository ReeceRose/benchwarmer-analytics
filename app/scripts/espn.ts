// Runs the ESPN steps by hand and backfills transactions and sportsbook lines.
//
//   npx tsx scripts/espn.ts injuries
//   npx tsx scripts/espn.ts transactions [--from 2022-09-01] [--to 2026-10-14]
//   npx tsx scripts/espn.ts odds [--from 2022-10-01] [--to 2026-10-14] [--force]
//
// Backfills go a month at a time (transactions) or a date at a time (odds),
// sequentially. Odds skip games that already have a closing line unless
// --force, so a stopped backfill resumes where it left off. ESPN keeps lines
// from 2022-23 on. Uses DATABASE_URL_UNPOOLED (direct), else DATABASE_URL.
// Afterwards purge the API cache (see docs/DEPLOY_NOTES.md).
import { parseArgs } from "node:util";
import { config } from "dotenv";

config({ path: [".env.local", "../.env.local"], quiet: true });

const { closePool, getPool } = await import("@/server/ingestion/db");
const { addDays, todayEastern } = await import("@/server/ingestion/nhl");
const { importOdds } = await import("@/server/ingestion/espn/odds");
const { importTransactions } = await import("@/server/ingestion/espn/transactions");
const { syncInjuries } = await import("@/server/ingestion/steps");
const { consoleLogger } = await import("@/server/ingestion/sync-runs");

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { from: { type: "string" }, to: { type: "string" }, force: { type: "boolean" } },
});
const command = positionals[0];
const today = todayEastern();
const db = getPool();

const firstOfNextMonth = (date: string) => {
  const d = new Date(`${date.slice(0, 7)}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
};

try {
  if (command === "injuries") {
    await syncInjuries(db);
  } else if (command === "transactions") {
    const end = values.to ?? today;
    let written = 0;
    for (let start = values.from ?? addDays(today, -3); start <= end; start = firstOfNextMonth(start)) {
      const monthEnd = addDays(firstOfNextMonth(start), -1);
      written += (await importTransactions(db, start, monthEnd < end ? monthEnd : end, consoleLogger)).written;
    }
    console.log(`transactions: ${written} rows written`);
  } else if (command === "odds") {
    const from = values.from ?? addDays(today, -1);
    const to = values.to ?? today;
    // Dates with games that still need lines.
    const { rows } = await db.query<{ date: string }>(
      `SELECT DISTINCT g.game_date::text AS date FROM games g
       WHERE g.game_date BETWEEN $1 AND $2 AND g.game_type IN (2, 3)
         AND ($3 OR NOT EXISTS (
           SELECT 1 FROM game_odds o WHERE o.game_id = g.game_id AND o.home_probability_close IS NOT NULL))
       ORDER BY 1`,
      [from, to, values.force ?? false],
    );
    console.log(`odds: ${rows.length} dates to fetch`);
    let written = 0;
    for (const { date } of rows) written += (await importOdds(db, [date], consoleLogger, 200)).written;
    console.log(`odds: ${written} rows written`);
  } else {
    console.error("usage: npx tsx scripts/espn.ts injuries | transactions | odds [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--force]");
    process.exitCode = 1;
  }
} finally {
  await closePool();
}
