// Backfill CLI: loads MoneyPuck + NHL data season by season, including games
// and score-state.
//
//   npm run backfill -- [--from-season 2008] [--to-season 2025]
//                       [--dataset teams,skaters,...] [--force] [--yes]
//
// Resumable: each (step, season) that already succeeded in sync_runs is
// skipped unless --force. Uses DATABASE_URL_UNPOOLED (direct), else DATABASE_URL.
import { parseArgs } from "node:util";
import { config } from "dotenv";

config({ path: [".env.local", "../.env.local"], quiet: true });

const { closePool, getPool, ingestionDatabaseUrl } = await import("@/server/ingestion/db");
const { currentSeason } = await import("@/server/ingestion/normalize");
const { failStaleRuns, hasSucceeded } = await import("@/server/ingestion/sync-runs");
const steps = await import("@/server/ingestion/steps");

const SEASON_STEPS = [...steps.SEASON_DATASETS, "shots", "games", "score_state"] as const;
const ALL_STEPS = ["bios", "nhl_records", ...SEASON_STEPS, "team_games", "views"] as const;
type Step = (typeof ALL_STEPS)[number];

const { values } = parseArgs({
  options: {
    "from-season": { type: "string" },
    "to-season": { type: "string" },
    dataset: { type: "string" },
    force: { type: "boolean", default: false },
    yes: { type: "boolean", default: false },
  },
});

function seasonArg(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const season = Number(value);
  if (!Number.isInteger(season) || season < steps.FIRST_SEASON || season > currentSeason()) {
    throw new Error(`season must be between ${steps.FIRST_SEASON} and ${currentSeason()}: ${value}`);
  }
  return season;
}

const fromSeason = seasonArg(values["from-season"], steps.FIRST_SEASON);
const toSeason = seasonArg(values["to-season"], currentSeason());
const selected = new Set<Step>(values.dataset ? (values.dataset.split(",").map((s) => s.trim()) as Step[]) : ALL_STEPS);
for (const step of selected) {
  if (!ALL_STEPS.includes(step)) throw new Error(`unknown dataset "${step}" (expected: ${ALL_STEPS.join(", ")})`);
}

const target = new URL(ingestionDatabaseUrl());
const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(target.hostname);
console.log(`Target: ${target.hostname}${target.pathname} | seasons ${fromSeason}-${toSeason} | steps ${[...selected].join(", ")}${values.force ? " | force" : ""}`);
if (!local && !values.yes) {
  console.error("Refusing to write to a non-local database without --yes.");
  process.exit(1);
}

const db = getPool();
const started = Date.now();
let failures = 0;

async function run(step: Step, season: number | null, fn: () => Promise<unknown>) {
  if (!selected.has(step)) return;
  if (!values.force && (await hasSucceeded(db, step, season))) {
    console.log(`${step}${season === null ? "" : ` ${season}`}: already done, skipping`);
    return;
  }
  try {
    await fn();
  } catch {
    // runStep logged and recorded the failure; continue with other work.
    failures++;
  }
}

try {
  await failStaleRuns(db, 60);
  await run("bios", null, () => steps.syncBios(db));
  await run("nhl_records", null, () => steps.syncNhlRecords(db));
  for (let season = fromSeason; season <= toSeason; season++) {
    for (const dataset of steps.SEASON_DATASETS) await run(dataset, season, () => steps.syncSeasonDataset(db, dataset, season));
    await run("shots", season, () => steps.syncShots(db, season, { incremental: false }));
    await run("games", season, () => steps.syncSeasonGames(db, season));
    await run("score_state", season, () => steps.syncScoreStates(db, season));
  }
  // One file holds every season: a single pass after teams and games exist.
  // A full-range run imports all seasons; a narrower one, each season in turn.
  if (fromSeason === steps.FIRST_SEASON && toSeason === currentSeason()) {
    await run("team_games", null, () => steps.syncTeamGames(db, null));
  } else {
    for (let season = fromSeason; season <= toSeason; season++) {
      await run("team_games", season, () => steps.syncTeamGames(db, season));
    }
  }
  // Views always refresh at the end (cheap, and data may have changed).
  if (selected.has("views")) {
    try {
      await steps.refreshViews(db);
    } catch {
      failures++;
    }
  }
} finally {
  await closePool();
}

console.log(`Backfill finished in ${((Date.now() - started) / 60_000).toFixed(1)} min with ${failures} failed step(s).`);
process.exit(failures > 0 ? 1 : 0);
