import { and, asc, eq, inArray, lt, lte, max } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import { games, playoffOdds, playoffOddsGames } from "@/server/db/schema";
import type { ApiContext } from "@/server/api/handler";
import { badRequest } from "@/server/api/errors";
import { GameState } from "@/server/api/constants";
import { round } from "@/server/api/format";
import { currentSeason } from "@/server/ingestion/normalize";
import { PREGAME_COEFFICIENTS } from "@/server/projections/pregame-model";
import { pregameHomeWinProbability } from "@/server/projections/ratings";
import { SIMULATIONS } from "@/server/projections/run";

async function latestRunDate(db: Database, season: number, onOrBefore?: string): Promise<string | null> {
  const [row] = await db
    .select({ value: max(playoffOdds.runDate) })
    .from(playoffOdds)
    .where(and(eq(playoffOdds.season, season), onOrBefore ? lte(playoffOdds.runDate, onOrBefore) : undefined));
  return row?.value ?? null;
}

/**
 * The latest playoff odds run: every team's projection, the change in playoff
 * odds since the previous run, and that day's games with each team's odds if
 * it wins or loses.
 */
export async function getPlayoffOdds({ db, query }: ApiContext) {
  const season = query.int("season") ?? currentSeason();
  const runDate = await latestRunDate(db, season);
  if (!runDate) return { season, runDate: null, previousRunDate: null, simulations: SIMULATIONS, teams: [], games: [] };

  const [[previous], current, tonight] = await Promise.all([
    db
      .select({ value: max(playoffOdds.runDate) })
      .from(playoffOdds)
      .where(and(eq(playoffOdds.season, season), lt(playoffOdds.runDate, runDate))),
    db.select().from(playoffOdds).where(and(eq(playoffOdds.season, season), eq(playoffOdds.runDate, runDate))),
    db.select().from(playoffOddsGames).where(eq(playoffOddsGames.runDate, runDate)).orderBy(asc(playoffOddsGames.gameId)),
  ]);
  const previousRunDate = previous?.value ?? null;
  const before = previousRunDate
    ? await db
        .select({ team: playoffOdds.team, makePlayoffs: playoffOdds.makePlayoffs })
        .from(playoffOdds)
        .where(and(eq(playoffOdds.season, season), eq(playoffOdds.runDate, previousRunDate)))
    : [];
  const previousOdds = new Map(before.map((r) => [r.team, r.makePlayoffs]));

  return {
    season,
    runDate,
    previousRunDate,
    simulations: SIMULATIONS,
    teams: current
      .map((r) => ({
        team: r.team,
        conference: r.conference,
        division: r.division,
        gamesPlayed: r.gamesPlayed,
        points: r.points,
        pointsAvg: r.pointsAvg,
        pointsP10: r.pointsP10,
        pointsP90: r.pointsP90,
        makePlayoffs: r.makePlayoffs,
        winRound1: r.winRound1,
        winRound2: r.winRound2,
        winConference: r.winConference,
        winCup: r.winCup,
        makePlayoffsChange: previousOdds.has(r.team) ? round(r.makePlayoffs - previousOdds.get(r.team)!, 4) : null,
      }))
      .sort((a, b) => b.pointsAvg - a.pointsAvg || a.team.localeCompare(b.team)),
    games: tonight.map((g) => ({
      gameId: g.gameId,
      homeTeam: g.homeTeam,
      awayTeam: g.awayTeam,
      homeWinProbability: g.homeWinProbability,
      homeIfWin: g.homeIfWin,
      homeIfLoss: g.homeIfLoss,
      awayIfWin: g.awayIfWin,
      awayIfLoss: g.awayIfLoss,
    })),
  };
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Pregame win probability for one day's games (default today, ET), from the
 * team ratings of the latest run on or before that day.
 */
export async function getGameProjections({ db, query }: ApiContext) {
  const date = query.string("date");
  if (!date || !DATE.test(date)) badRequest("date (YYYY-MM-DD) is required");
  const dayGames = await db
    .select({ gameId: games.gameId, season: games.season, home: games.homeTeamCode, away: games.awayTeamCode })
    .from(games)
    .where(and(eq(games.gameDate, date), inArray(games.gameType, [GameState.regularSeason, GameState.playoffs])))
    .orderBy(asc(games.gameId));
  if (dayGames.length === 0) return { date, runDate: null, games: [] };
  const season = dayGames[0].season;
  const runDate = await latestRunDate(db, season, date);
  if (!runDate) return { date, runDate: null, games: [] };
  const ratings = await db
    .select({ team: playoffOdds.team, xgd: playoffOdds.ratingXgd, gd: playoffOdds.ratingGd, gamesPlayed: playoffOdds.gamesPlayed })
    .from(playoffOdds)
    .where(and(eq(playoffOdds.season, season), eq(playoffOdds.runDate, runDate)));
  const byTeam = new Map(ratings.map((r) => [r.team, r]));
  return {
    date,
    runDate,
    games: dayGames.flatMap((g) => {
      const home = byTeam.get(g.home);
      const away = byTeam.get(g.away);
      if (!home || !away) return [];
      return [{ gameId: g.gameId, homeWinProbability: round(pregameHomeWinProbability(home, away, PREGAME_COEFFICIENTS), 4) }];
    }),
  };
}
