import { games } from "@/server/db/schema";
import { upsert, type Queryable, type UpsertRow } from "@/server/ingestion/db";
import { fetchWithRetry } from "@/server/ingestion/http";

const NHL_API = "https://api-web.nhle.com/v1";

export interface NhlScheduleResponse {
  gameWeek?: {
    date: string;
    games: {
      id: number;
      season: number;
      gameType: number;
      gameState: string;
      startTimeUTC?: string | null;
      homeTeam: { abbrev: string; score?: number | null };
      awayTeam: { abbrev: string; score?: number | null };
      periodDescriptor?: { periodType?: string | null } | null;
    }[];
  }[];
}

export type GameRow = UpsertRow<typeof games> & { gameId: string; gameDate: string };

// A schedule entry, typed precisely (it is also a valid GameRow).
export interface ScheduledGame {
  gameId: string;
  season: number;
  gameType: number;
  gameDate: string;
  startTimeUtc: Date | null;
  homeTeamCode: string;
  awayTeamCode: string;
  homeScore: number;
  awayScore: number;
  gameState: string;
  periodType: string | null;
}

const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

// One schedule week starting at `date`.
export async function fetchScheduleWeek(date: string): Promise<GameRow[]> {
  const response = await fetchWithRetry(`${NHL_API}/schedule/${date}`);
  if (!response) return [];
  return scheduleToGames((await response.json()) as NhlScheduleResponse);
}

export function scheduleToGames(schedule: NhlScheduleResponse): ScheduledGame[] {
  const rows: ScheduledGame[] = [];
  for (const day of schedule.gameWeek ?? []) {
    for (const game of day.games) {
      rows.push({
        gameId: String(game.id),
        // Season code 20242025 → 2024
        season: Math.trunc(game.season / 10000),
        gameType: game.gameType,
        gameDate: day.date,
        startTimeUtc: game.startTimeUTC ? new Date(game.startTimeUTC) : null,
        homeTeamCode: game.homeTeam.abbrev,
        awayTeamCode: game.awayTeam.abbrev,
        homeScore: game.homeTeam.score ?? 0,
        awayScore: game.awayTeam.score ?? 0,
        gameState: game.gameState,
        periodType: game.periodDescriptor?.periodType ?? null,
      });
    }
  }
  return rows;
}

// Games dated within [start, end] (inclusive, YYYY-MM-DD), fetched a week at a
// time.
export async function fetchGames(start: string, end: string): Promise<GameRow[]> {
  const byId = new Map<string, GameRow>();
  for (let date = start; date <= end; date = addDays(date, 7)) {
    for (const game of await fetchScheduleWeek(date)) {
      if (game.gameDate >= start && game.gameDate <= end) byId.set(game.gameId, game);
    }
  }
  return [...byId.values()].sort((a, b) => a.gameDate.localeCompare(b.gameDate) || a.gameId.localeCompare(b.gameId));
}

// Date range covering a season's preseason through the end of the playoffs.
// Runs to October 1 to include the 2019-20 bubble playoffs (Aug-Sep 2020);
// callers filter by the API's season field, so next season's preseason games
// in late September aren't mislabeled.
export function seasonDateRange(season: number): [string, string] {
  return [`${season}-09-01`, `${season + 1}-10-01`];
}

export async function upsertGames(db: Queryable, rows: GameRow[]): Promise<number> {
  return upsert(db, games, rows, { conflict: ["gameId"] });
}

// Today's date in US Eastern time (the NHL schedules by ET), YYYY-MM-DD.
export function todayEastern(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(now);
}

export { addDays };
