// The standings race (points by date) and each team's travel and
// back-to-backs, worked out from the regular-season schedule in `games`.

import { and, asc, eq } from "drizzle-orm";
import { games, teams } from "@/server/db/schema";
import type { ApiContext } from "@/server/api/handler";
import { isFinalState, GameState } from "@/server/api/constants";
import { dayNumber } from "@/server/api/format";
import { currentSeason } from "@/server/ingestion/normalize";
import type { RaceTeam, StandingsRaceResponse, TeamTravel, TravelResponse } from "@/types";

// Home arenas (latitude, longitude), from NHL records plus PPG Paints Arena
// and the Delta Center, which the records site has no coordinates for.
export const ARENAS: Record<string, [number, number]> = {
  ANA: [33.807881, -117.876556], BOS: [42.3663, -71.062261], BUF: [42.875067, -78.876375],
  CAR: [35.803333, -78.721944], CBJ: [39.969283, -83.006111], CGY: [51.0375, -114.051944],
  CHI: [41.880575, -87.674186], COL: [39.748547, -105.007642], DAL: [32.790406, -96.810283],
  DET: [42.32515, -83.051428], EDM: [53.546944, -113.497778], FLA: [26.158333, -80.32527],
  LAK: [34.043058, -118.267122], MIN: [44.944847, -93.101222], MTL: [45.496019, -73.56935],
  NJD: [40.733583, -74.170975], NSH: [36.159122, -86.778456], NYI: [40.711955, -73.726197],
  NYR: [40.750486, -73.993547], OTT: [45.296892, -75.927281], PHI: [39.901217, -75.172044],
  PIT: [40.439444, -79.989167], SEA: [47.621943, -122.35449], SJS: [37.332778, -121.901389],
  STL: [38.626789, -90.202569], TBL: [27.942664, -82.451856], TOR: [43.643386, -79.379072],
  UTA: [40.768333, -111.901111], VAN: [49.277808, -123.108761], VGK: [36.10278, -115.17833],
  WPG: [49.892485, -97.143576], WSH: [38.898075, -77.020947],
};

const EARTH_MILES = 3958.8;

/** Great-circle miles between two arenas (0 if either is unknown). */
export function milesBetween(a: string, b: string): number {
  const p = ARENAS[a];
  const q = ARENAS[b];
  if (!p || !q || a === b) return 0;
  const rad = Math.PI / 180;
  const dLat = (q[0] - p[0]) * rad;
  const dLon = (q[1] - p[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(p[0] * rad) * Math.cos(q[0] * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_MILES * Math.asin(Math.sqrt(h));
}

export interface ScheduleGame {
  gameDate: string;
  homeTeamCode: string;
  awayTeamCode: string;
  homeScore: number;
  awayScore: number;
  gameState: string;
  periodType: string | null;
}

/** Points by date for every team, from final games (2 a win, 1 an overtime or shootout loss). */
export function raceSeries(schedule: ScheduleGame[]): Map<string, RaceTeam["points"]> {
  const series = new Map<string, RaceTeam["points"]>();
  for (const g of schedule) {
    if (!isFinalState(g.gameState)) continue;
    const homeWon = g.homeScore > g.awayScore;
    const extra = g.periodType === "OT" || g.periodType === "SO";
    for (const [team, won] of [[g.homeTeamCode, homeWon], [g.awayTeamCode, !homeWon]] as const) {
      const list = series.get(team) ?? [];
      const last = list.at(-1);
      const gained = won ? 2 : extra ? 1 : 0;
      const point = { date: g.gameDate, gamesPlayed: (last?.gamesPlayed ?? 0) + 1, points: (last?.points ?? 0) + gained };
      // Two games on one date can't happen; keep one point per date anyway.
      if (last?.date === g.gameDate) list[list.length - 1] = point;
      else list.push(point);
      series.set(team, list);
    }
  }
  return series;
}

/**
 * Each team's miles, back-to-backs and longest road trip. Every game counts
 * as played in the home team's arena; the season starts at home.
 */
export function teamTravel(schedule: ScheduleGame[]): TeamTravel[] {
  const byTeam = new Map<string, ScheduleGame[]>();
  for (const g of schedule) {
    for (const team of [g.homeTeamCode, g.awayTeamCode]) {
      const list = byTeam.get(team) ?? [];
      list.push(g);
      byTeam.set(team, list);
    }
  }
  return [...byTeam.entries()]
    .map(([team, list]) => {
      let at = team;
      let prevDay: number | null = null;
      let seasonMiles = 0;
      let milesSoFar = 0;
      let gamesPlayed = 0;
      let backToBacks = 0;
      let backToBacksSoFar = 0;
      let road = 0;
      let longestRoadTrip = 0;
      for (const g of list) {
        const final = isFinalState(g.gameState);
        const miles = milesBetween(at, g.homeTeamCode);
        seasonMiles += miles;
        if (final) {
          milesSoFar += miles;
          gamesPlayed++;
        }
        at = g.homeTeamCode;
        const day = dayNumber(g.gameDate);
        if (prevDay !== null && day - prevDay === 1) {
          backToBacks++;
          if (final) backToBacksSoFar++;
        }
        prevDay = day;
        road = g.awayTeamCode === team ? road + 1 : 0;
        longestRoadTrip = Math.max(longestRoadTrip, road);
      }
      return {
        team,
        seasonMiles: Math.round(seasonMiles),
        milesSoFar: Math.round(milesSoFar),
        gamesPlayed,
        backToBacks,
        backToBacksSoFar,
        longestRoadTrip,
      };
    })
    .filter((t) => ARENAS[t.team])
    .sort((a, b) => b.seasonMiles - a.seasonMiles || a.team.localeCompare(b.team));
}

async function regularSeason(ctx: ApiContext, season: number): Promise<ScheduleGame[]> {
  return ctx.db
    .select({
      gameDate: games.gameDate,
      homeTeamCode: games.homeTeamCode,
      awayTeamCode: games.awayTeamCode,
      homeScore: games.homeScore,
      awayScore: games.awayScore,
      gameState: games.gameState,
      periodType: games.periodType,
    })
    .from(games)
    .where(and(eq(games.season, season), eq(games.gameType, GameState.regularSeason)))
    .orderBy(asc(games.gameDate), asc(games.gameId));
}

export async function getStandingsRace(ctx: ApiContext): Promise<StandingsRaceResponse> {
  const season = ctx.query.int("season") ?? currentSeason();
  const [schedule, teamRows] = await Promise.all([
    regularSeason(ctx, season),
    ctx.db.select({ abbreviation: teams.abbreviation, division: teams.division, conference: teams.conference }).from(teams),
  ]);
  const info = new Map(teamRows.map((t) => [t.abbreviation, t]));
  const series = raceSeries(schedule);
  return {
    season,
    teams: [...series.entries()]
      .map(([team, points]) => ({ team, division: info.get(team)?.division ?? null, conference: info.get(team)?.conference ?? null, points }))
      .sort((a, b) => a.team.localeCompare(b.team)),
  };
}

export async function getTravel(ctx: ApiContext): Promise<TravelResponse> {
  const season = ctx.query.int("season") ?? currentSeason();
  return { season, teams: teamTravel(await regularSeason(ctx, season)) };
}
