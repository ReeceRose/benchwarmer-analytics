import type { Queryable } from "@/server/ingestion/db";
import { importPlayerBios } from "@/server/ingestion/importers/bios";
import { importGoalies } from "@/server/ingestion/importers/goalies";
import { importLines } from "@/server/ingestion/importers/lines";
import { importShots, incrementalGameFilter } from "@/server/ingestion/importers/shots";
import { importSkaterGames } from "@/server/ingestion/importers/skater-games";
import { runProjections } from "@/server/projections/run";
import { importSkaters } from "@/server/ingestion/importers/skaters";
import { importTeamGames, loadGameAwayTeams } from "@/server/ingestion/importers/team-games";
import { importTeams } from "@/server/ingestion/importers/teams";
import {
  downloadPlayerBios,
  downloadSeasonSummary,
  streamShotsCsv,
  streamTeamGamesCsv,
  type SeasonDataset,
} from "@/server/ingestion/moneypuck";
import { importNhlRecords } from "@/server/ingestion/nhl-records";
import { addDays, fetchGames, seasonDateRange, todayEastern, upsertGames } from "@/server/ingestion/nhl";
import { importInjuries } from "@/server/ingestion/espn/injuries";
import { importOdds } from "@/server/ingestion/espn/odds";
import { importTransactions } from "@/server/ingestion/espn/transactions";
import { calculateScoreStates } from "@/server/ingestion/score-state";
import { consoleLogger, runStep, type Logger, type StepResult } from "@/server/ingestion/sync-runs";

// Datasets with separate regular-season and playoff files, in dependency
// order: lines resolve players through the season's skater rows.
export const SEASON_DATASETS: SeasonDataset[] = ["teams", "skaters", "goalies", "lines"];

export const FIRST_SEASON = 2008;

async function importSeasonFile(db: Queryable, dataset: SeasonDataset, season: number, playoffs: boolean, logger: Logger) {
  const csv = await downloadSeasonSummary(dataset, season, playoffs);
  if (csv === null) {
    // Playoff files don't exist until the playoffs start.
    if (!playoffs) logger.warn(`${dataset} ${season} regular: file not found`);
    return 0;
  }
  switch (dataset) {
    case "teams":
      return importTeams(db, csv, playoffs);
    case "skaters":
      return importSkaters(db, csv, playoffs);
    case "goalies":
      return importGoalies(db, csv, playoffs);
    case "lines":
      return (await importLines(db, csv, logger)).written;
  }
}

// One MoneyPuck season-summary dataset (regular season + playoffs).
// Lines are regular season only: line_combinations has no playoffs column, so
// playoff numbers would overwrite regular-season rows for every line that
// played in both (and the API only serves regular-season lines).
export function syncSeasonDataset(db: Queryable, dataset: SeasonDataset, season: number, logger = consoleLogger) {
  return runStep(db, dataset, season, async (): Promise<StepResult> => {
    let rowsWritten = await importSeasonFile(db, dataset, season, false, logger);
    if (dataset !== "lines") rowsWritten += await importSeasonFile(db, dataset, season, true, logger);
    return { rowsWritten };
  }, logger);
}

// Team game-by-game rows. The file covers every season, so null imports all
// of them in one pass (backfill) and a season filters to that season (cron).
// Runs after teams (foreign key) and games (opponent repairs).
export function syncTeamGames(db: Queryable, season: number | null, logger = consoleLogger) {
  return runStep(db, "team_games", season, async () => {
    const awayTeams = await loadGameAwayTeams(db, season);
    const imported = await importTeamGames(db, await streamTeamGamesCsv(), season, awayTeams);
    if (imported.skipped > 0) logger.warn(`team_games ${season ?? "all"}: skipped ${imported.skipped} rows with no opponent`);
    return { rowsWritten: imported.written };
  }, logger);
}

export function syncBios(db: Queryable, logger = consoleLogger) {
  return runStep(db, "bios", null, async () => ({ rowsWritten: await importPlayerBios(db, await downloadPlayerBios()) }), logger);
}

// NHL records: franchises and their seasons, all-time head-to-head records,
// draft picks and career totals (one request per list, ~45k rows in all).
export function syncNhlRecords(db: Queryable, logger = consoleLogger) {
  return runStep(db, "nhl_records", null, async () => {
    const result = await importNhlRecords(db);
    logger.info(`nhl_records: ${JSON.stringify(result)}`);
    return { rowsWritten: Object.values(result).reduce((a, b) => a + b, 0) };
  }, logger);
}

export interface ShotSyncOptions {
  // Incremental: only games without stored shots plus recent ones.
  incremental: boolean;
  recentDays?: number;
}

// Returns the game IDs whose shots were (re)imported, for scoped derived work.
export async function syncShots(db: Queryable, season: number, options: ShotSyncOptions, logger = consoleLogger) {
  let gameIds = new Set<string>();
  const result = await runStep(db, "shots", season, async () => {
    const csv = await streamShotsCsv(season);
    if (!csv) {
      logger.warn(`shots ${season}: file not found`);
      return { rowsWritten: 0 };
    }
    const includeGame = options.incremental ? await incrementalGameFilter(db, season, options.recentDays ?? 3) : undefined;
    const imported = await importShots(db, csv, { includeGame });
    gameIds = imported.gameIds;
    logger.info(`shots ${season}: read ${imported.rowsRead}, considered ${imported.rowsConsidered} in ${imported.gameIds.size} games`);
    return { rowsWritten: imported.written };
  }, logger);
  return { ...result, gameIds };
}

// NHL schedule/games. `season` limits rows to that season (backfill).
export function syncGames(db: Queryable, start: string, end: string, season: number | null, logger = consoleLogger) {
  return runStep(db, "games", season, async () => {
    const rows = await fetchGames(start, end);
    return { rowsWritten: await upsertGames(db, season === null ? rows : rows.filter((g) => g.season === season)) };
  }, logger);
}

export function syncSeasonGames(db: Queryable, season: number, logger = consoleLogger) {
  const [start, end] = seasonDateRange(season);
  return syncGames(db, start, end, season, logger);
}

// Yesterday (ET) through the next 7 days. The API is read-only, so the cron
// stores the coming week up front (game previews and goalie form look games
// up by ID).
export function syncRecentGames(db: Queryable, logger = consoleLogger) {
  const today = todayEastern();
  return syncGames(db, addDays(today, -1), addDays(today, 7), null, logger);
}

// Per-game Game Score for final games that don't have it yet, oldest first.
// `limit` keeps a run inside the cron's time budget (three NHL requests per
// game); a backlog clears over successive runs.
export function syncSkaterGames(db: Queryable, season: number, limit = 45, logger = consoleLogger) {
  return runStep(db, "skater_games", season, async () => {
    const result = await importSkaterGames(db, season, limit, logger);
    return { rowsWritten: result.written };
  }, logger);
}

// Playoff odds and team ratings for today (ET), from NHL standings and a
// season simulation. Same day, same inputs, same seed: re-runs write nothing.
export function syncProjections(db: Queryable, season: number, logger = consoleLogger) {
  return runStep(db, "projections", season, async () => {
    const result = await runProjections(db, season);
    logger.info(`projections ${season}: ${result.remaining} games left, ${result.tonight} today`);
    return { rowsWritten: result.written };
  }, logger);
}

export function syncScoreStates(db: Queryable, season: number, gameIds?: string[], logger = consoleLogger) {
  return runStep(db, "score_state", season, async () => ({ rowsWritten: await calculateScoreStates(db, season, gameIds) }), logger);
}

// CONCURRENTLY keeps the views readable during refresh and only applies changed rows.
// ANALYZE then refreshes planner statistics. Autovacuum can't be relied on for
// that: Neon resets its change counters whenever the compute scales to zero,
// and without fresh stats the planner thinks the current season has no rows
// and picks nested-loop plans that turn leaderboard queries into seconds.
export function refreshViews(db: Queryable, logger = consoleLogger) {
  return runStep(db, "views", null, async () => {
    await db.query("REFRESH MATERIALIZED VIEW CONCURRENTLY chemistry_pairs");
    await db.query("REFRESH MATERIALIZED VIEW CONCURRENTLY season_percentiles");
    await db.query("REFRESH MATERIALIZED VIEW CONCURRENTLY goalie_pulls");
    await db.query("ANALYZE");
    return { rowsWritten: 0 };
  }, logger);
}

// ESPN's injury list → injury stints (snapshot reconcile, see espn/injuries.ts).
export function syncInjuries(db: Queryable, logger = consoleLogger) {
  return runStep(db, "espn_injuries", null, async () => {
    const result = await importInjuries(db, logger);
    return { rowsWritten: result.inserted + result.updated + result.resolved + result.athletesWritten };
  }, logger);
}

// ESPN transactions for the last `days` days (ET): ESPN sometimes adds or
// edits entries a day or two late.
export function syncTransactions(db: Queryable, days = 3, logger = consoleLogger) {
  return runStep(db, "espn_transactions", null, async () => {
    const today = todayEastern();
    return { rowsWritten: (await importTransactions(db, addDays(today, -days), today, logger)).written };
  }, logger);
}

// Sportsbook lines for yesterday's games (closing lines, now final) and
// today's (opening lines so far).
export function syncOdds(db: Queryable, logger = consoleLogger) {
  return runStep(db, "espn_odds", null, async () => {
    const today = todayEastern();
    return { rowsWritten: (await importOdds(db, [addDays(today, -1), today], logger)).written };
  }, logger);
}
