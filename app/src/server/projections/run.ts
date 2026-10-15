import { GameState } from "@/server/api/constants";
import { getStandings, type NhlTeamStandings } from "@/server/api/nhl-client";
import { playoffOdds, playoffOddsGames } from "@/server/db/schema";
import { upsert, type Queryable } from "@/server/ingestion/db";
import { todayEastern } from "@/server/ingestion/nhl";
import { OVERTIME_RATE, PREGAME_COEFFICIENTS, RATING_PARAMS } from "@/server/projections/pregame-model";
import { blendRating, type Rating } from "@/server/projections/ratings";
import { simulateSeason, type SimGame, type SimTeam } from "@/server/projections/simulate";

export const SIMULATIONS = 20_000;

// Uncertainty in true team strength (logit scale, before any games), chosen by
// scripts/calibrate-season-sims.ts: with it, each team's 10th-90th percentile
// points range held its actual final points 79-80% of the time when replaying
// 2015-2024 from 8 and from 41 games played (64% and 72% without it).
export const STRENGTH_SD = 0.26;

interface SumRow {
  season: number;
  team: string;
  n: number;
  xgd: number;
  gd: number;
}

/**
 * Each team's rating: this season's regular-season 5v5 xG and goal
 * differentials blended with last season's (see ratings.ts).
 */
export async function teamRatings(db: Queryable, season: number): Promise<Map<string, Rating>> {
  const { rows } = await db.query<SumRow>(
    `SELECT t5.season, t5.team_abbreviation AS team, count(*)::int AS n,
            sum(t5.score_venue_adjusted_x_goals_for - t5.score_venue_adjusted_x_goals_against)::float8 AS xgd,
            sum(ta.goals_for - ta.goals_against)::float8 AS gd
     FROM team_games t5
     JOIN team_games ta ON ta.game_id = t5.game_id AND ta.team_abbreviation = t5.team_abbreviation AND ta.situation = 'all'
     WHERE t5.situation = '5on5' AND NOT t5.is_playoffs AND t5.season IN ($1, $2)
     GROUP BY 1, 2`,
    [season - 1, season],
  );
  const prior = new Map(rows.filter((r) => r.season === season - 1).map((r) => [r.team, { xgd: r.xgd / r.n, gd: r.gd / r.n, gamesPlayed: r.n }]));
  const current = new Map(rows.filter((r) => r.season === season).map((r) => [r.team, r]));
  const teams = new Set([...prior.keys(), ...current.keys()]);
  return new Map([...teams].map((team) => [team, blendRating(current.get(team) ?? { xgd: 0, gd: 0, n: 0 }, prior.get(team), RATING_PARAMS)]));
}

/** Regular-season games from `today` on that aren't final. */
async function remainingGames(db: Queryable, season: number, today: string): Promise<(SimGame & { gameDate: string })[]> {
  const { rows } = await db.query<SimGame & { gameDate: string }>(
    `SELECT game_id AS "gameId", home_team_code AS home, away_team_code AS away, game_date::text AS "gameDate"
     FROM games
     WHERE season = $1 AND game_type = $2 AND game_state NOT IN ($3, $4) AND game_date >= $5
     ORDER BY game_date, game_id`,
    [season, GameState.regularSeason, GameState.final, GameState.finalAlt, today],
  );
  return rows;
}

export function simTeams(standings: Map<string, NhlTeamStandings>, ratings: Map<string, Rating>): SimTeam[] {
  return [...standings].map(([abbrev, s]) => ({
    abbrev,
    conference: s.conferenceName ?? "",
    division: s.divisionName ?? "",
    points: s.points ?? 0,
    gamesPlayed: s.gamesPlayed ?? 0,
    regulationWins: s.regulationWins ?? 0,
    rating: ratings.get(abbrev) ?? { xgd: 0, gd: 0, gamesPlayed: 0 },
  }));
}

const fixed = (v: number, digits = 4) => v.toFixed(digits);

/**
 * Simulates the rest of the season from today's standings and stores the
 * odds for `today` (ET). Standings come from the NHL, so they already include
 * last night's results; games before today are excluded so nothing counts twice.
 */
export async function runProjections(db: Queryable, season: number, today = todayEastern()) {
  const standings = await getStandings();
  if (standings.size < 32) throw new Error(`NHL standings returned ${standings.size} teams`);
  const [ratings, remaining] = await Promise.all([teamRatings(db, season), remainingGames(db, season, today)]);
  const teams = simTeams(standings, ratings);
  const tonight = remaining.filter((g) => g.gameDate === today);
  const seed = Number(today.replaceAll("-", ""));
  const { odds, watched } = simulateSeason(teams, remaining, {
    sims: SIMULATIONS,
    seed,
    coefficients: PREGAME_COEFFICIENTS,
    overtimeRate: OVERTIME_RATE,
    strengthSd: STRENGTH_SD,
    priorGames: RATING_PARAMS.priorGames,
    watch: tonight.map((g) => g.gameId),
  });

  const byTeam = new Map(teams.map((t) => [t.abbrev, t]));
  const oddsRows = odds.map((o) => {
    const t = byTeam.get(o.abbrev)!;
    return {
      season,
      runDate: today,
      team: o.abbrev,
      conference: t.conference,
      division: t.division,
      gamesPlayed: t.gamesPlayed,
      points: t.points,
      ratingXgd: fixed(t.rating.xgd),
      ratingGd: fixed(t.rating.gd),
      pointsAvg: fixed(o.pointsAvg, 1),
      pointsP10: o.pointsP10,
      pointsP90: o.pointsP90,
      makePlayoffs: fixed(o.makePlayoffs),
      winRound1: fixed(o.winRound1),
      winRound2: fixed(o.winRound2),
      winConference: fixed(o.winConference),
      winCup: fixed(o.winCup),
    };
  });
  const gameById = new Map(tonight.map((g) => [g.gameId, g]));
  const gameRows = watched.map((w) => ({
    season,
    runDate: today,
    gameId: w.gameId,
    homeTeam: gameById.get(w.gameId)!.home,
    awayTeam: gameById.get(w.gameId)!.away,
    homeWinProbability: fixed(w.homeWinProbability),
    homeIfWin: fixed(w.homeIfWin),
    homeIfLoss: fixed(w.homeIfLoss),
    awayIfWin: fixed(w.awayIfWin),
    awayIfLoss: fixed(w.awayIfLoss),
  }));
  const written =
    (await upsert(db, playoffOdds, oddsRows, { conflict: ["season", "runDate", "team"] })) +
    (await upsert(db, playoffOddsGames, gameRows, { conflict: ["runDate", "gameId"] }));
  return { written, remaining: remaining.length, tonight: tonight.length };
}
