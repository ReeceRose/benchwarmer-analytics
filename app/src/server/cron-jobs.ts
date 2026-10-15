// The daily cron jobs, shared by their routes and the catch-up cron. Each
// lists the sync_runs steps that always run when the job succeeds, so the
// catch-up can tell which jobs didn't finish today.

import { runIndependently } from "@/server/cron";
import type { Queryable } from "@/server/ingestion/db";
import {
  SEASON_DATASETS,
  refreshViews,
  syncInjuries,
  syncOdds,
  syncProjections,
  syncRecentGames,
  syncScoreStates,
  syncSeasonDataset,
  syncShots,
  syncSkaterGames,
  syncTeamGames,
  syncTransactions,
} from "@/server/ingestion/steps";

export interface DailyJob {
  path: string;
  /** Steps that record a successful run every time the job succeeds. */
  steps: string[];
  run: (db: Queryable, season: number) => Promise<Record<string, unknown>>;
}

// NHL schedule/scores from yesterday through the next week (ET).
const schedule: DailyJob = {
  path: "/api/cron/schedule",
  steps: ["games"],
  run: async (db) => ({ ...(await syncRecentGames(db)) }),
};

// MoneyPuck teams, skaters, goalies and lines (regular season + playoffs),
// then team game-by-game rows.
const seasonStats: DailyJob = {
  path: "/api/cron/season-stats",
  steps: [...SEASON_DATASETS, "team_games"],
  run: async (db, season) => {
    const rowsWritten: Record<string, number> = {};
    for (const dataset of SEASON_DATASETS) {
      rowsWritten[dataset] = (await syncSeasonDataset(db, dataset, season)).rowsWritten;
    }
    rowsWritten.team_games = (await syncTeamGames(db, season)).rowsWritten;
    return { season, rowsWritten };
  },
};

// Incremental shots (new games + the last few days), then score-state for the
// games touched, so it doesn't depend on the derived cron running afterwards.
const shots: DailyJob = {
  path: "/api/cron/shots",
  steps: ["shots"],
  run: async (db, season) => {
    const result = await syncShots(db, season, { incremental: true, recentDays: 3 });
    const gameIds = [...result.gameIds];
    const scoreState = gameIds.length > 0 ? await syncScoreStates(db, season, gameIds) : { rowsWritten: 0 };
    return { season, games: gameIds.length, rowsWritten: { shots: result.rowsWritten, scoreState: scoreState.rowsWritten } };
  },
};

// Full-season score-state recompute (only changed rows are written) and
// materialized view refresh.
const derived: DailyJob = {
  path: "/api/cron/derived",
  steps: ["score_state", "views"],
  run: async (db, season) => {
    const scoreState = await syncScoreStates(db, season);
    await refreshViews(db);
    return { season, rowsWritten: { scoreState: scoreState.rowsWritten } };
  },
};

// Per-game Game Score for final games without it (yesterday's, plus any
// backlog), after the schedule cron has marked them final.
const gameScores: DailyJob = {
  path: "/api/cron/game-scores",
  steps: ["skater_games"],
  run: async (db, season) => ({ season, rowsWritten: { skaterGames: (await syncSkaterGames(db, season)).rowsWritten } }),
};

// Daily playoff odds, after the schedule cron has stored last night's results.
const projections: DailyJob = {
  path: "/api/cron/projections",
  steps: ["projections"],
  run: async (db, season) => ({ season, rowsWritten: { projections: (await syncProjections(db, season)).rowsWritten } }),
};

// ESPN injuries and transactions, plus sportsbook lines (last night's closing
// lines and today's openers) before the projections run. Each step runs even
// if another fails. Injuries and transactions also run in the evening job, so
// only the odds mark this one as done.
const espnMorning: DailyJob = {
  path: "/api/cron/espn-morning",
  steps: ["espn_odds"],
  run: async (db) => ({
    rowsWritten: await runIndependently({
      injuries: async () => (await syncInjuries(db)).rowsWritten,
      transactions: async () => (await syncTransactions(db)).rowsWritten,
      odds: async () => (await syncOdds(db)).rowsWritten,
    }),
  }),
};

// ESPN injuries and transactions again before puck drop, for same-day news.
const espnEvening: DailyJob = {
  path: "/api/cron/espn-evening",
  steps: ["espn_injuries", "espn_transactions"],
  run: async (db) => ({
    rowsWritten: await runIndependently({
      injuries: async () => (await syncInjuries(db)).rowsWritten,
      transactions: async () => (await syncTransactions(db)).rowsWritten,
    }),
  }),
};

export const DAILY_JOBS = { schedule, seasonStats, shots, derived, gameScores, projections, espnMorning, espnEvening };

// Catch-up order: the order the jobs normally run in. The evening ESPN job
// runs after the catch-up, so it isn't retried here.
const CATCH_UP_ORDER: DailyJob[] = [schedule, seasonStats, shots, derived, gameScores, espnMorning, projections];

// Leave room for the slowest job inside the 300 s function limit.
const CATCH_UP_BUDGET_MS = 150_000;

/** Jobs with a required step that hasn't succeeded today (UTC). */
export async function jobsToCatchUp(db: Queryable): Promise<DailyJob[]> {
  const { rows } = await db.query<{ step: string }>(
    `SELECT DISTINCT step FROM sync_runs
     WHERE status = 'succeeded' AND started_at >= date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'`,
  );
  const done = new Set(rows.map((r) => r.step));
  return CATCH_UP_ORDER.filter((job) => job.steps.some((step) => !done.has(step)));
}

/**
 * Re-runs the daily jobs that failed or never ran today, in their usual
 * order. On a normal day there's nothing to do. A job that fails again is
 * reported without stopping the rest; jobs that don't fit in the time budget
 * are left for tomorrow's runs.
 */
export async function catchUp(db: Queryable, season: number) {
  const started = Date.now();
  const pending = await jobsToCatchUp(db);
  const steps: Record<string, () => Promise<unknown>> = {};
  const skipped: string[] = [];
  for (const job of pending) {
    steps[job.path] = async () => {
      if (Date.now() - started > CATCH_UP_BUDGET_MS) {
        skipped.push(job.path);
        return "skipped (time budget)";
      }
      return job.run(db, season);
    };
  }
  const ran = await runIndependently(steps);
  return { pending: pending.map((j) => j.path), skipped, ran };
}
