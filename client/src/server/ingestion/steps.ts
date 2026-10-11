import type { Queryable } from "@/server/ingestion/db";
import { importPlayerBios } from "@/server/ingestion/importers/bios";
import { importGoalies } from "@/server/ingestion/importers/goalies";
import { importLines } from "@/server/ingestion/importers/lines";
import { importShots, incrementalGameFilter } from "@/server/ingestion/importers/shots";
import { importSkaters } from "@/server/ingestion/importers/skaters";
import { importTeams } from "@/server/ingestion/importers/teams";
import { downloadPlayerBios, downloadSeasonSummary, streamShotsCsv, type SeasonDataset } from "@/server/ingestion/moneypuck";
import { addDays, fetchGames, seasonDateRange, todayEastern, upsertGames } from "@/server/ingestion/nhl";
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
// the C# import let playoff numbers overwrite regular-season rows for every
// line that played in both (and the API only serves regular-season lines).
export function syncSeasonDataset(db: Queryable, dataset: SeasonDataset, season: number, logger = consoleLogger) {
  return runStep(db, dataset, season, async (): Promise<StepResult> => {
    let rowsWritten = await importSeasonFile(db, dataset, season, false, logger);
    if (dataset !== "lines") rowsWritten += await importSeasonFile(db, dataset, season, true, logger);
    return { rowsWritten };
  }, logger);
}

export function syncBios(db: Queryable, logger = consoleLogger) {
  return runStep(db, "bios", null, async () => ({ rowsWritten: await importPlayerBios(db, await downloadPlayerBios()) }), logger);
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

// Yesterday and today (ET), like the C# nightly job.
export function syncRecentGames(db: Queryable, logger = consoleLogger) {
  const today = todayEastern();
  return syncGames(db, addDays(today, -1), today, null, logger);
}

export function syncScoreStates(db: Queryable, season: number, gameIds?: string[], logger = consoleLogger) {
  return runStep(db, "score_state", season, async () => ({ rowsWritten: await calculateScoreStates(db, season, gameIds) }), logger);
}

// CONCURRENTLY keeps the views readable during refresh and only applies changed rows.
export function refreshViews(db: Queryable, logger = consoleLogger) {
  return runStep(db, "views", null, async () => {
    await db.query("REFRESH MATERIALIZED VIEW CONCURRENTLY chemistry_pairs");
    await db.query("REFRESH MATERIALIZED VIEW CONCURRENTLY season_percentiles");
    return { rowsWritten: 0 };
  }, logger);
}
