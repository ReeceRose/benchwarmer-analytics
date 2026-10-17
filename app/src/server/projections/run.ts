import { GameState } from "@/server/api/constants";
import { getStandings, type NhlTeamStandings } from "@/server/api/nhl-client";
import { playoffOdds, playoffOddsGames, projectionInputs } from "@/server/db/schema";
import { upsert, type Queryable } from "@/server/ingestion/db";
import { todayEastern } from "@/server/ingestion/nhl";
import { GoalieTable, byGame, goalieGames } from "@/server/projections/goalies";
import { goalieOutlooks, injuredGoalies, seasonStarts } from "@/server/projections/injuries";
import {
  GOALIE_PARAMS,
  OVERTIME_RATE,
  PREGAME_COEFFICIENTS,
  RATING_PARAMS,
  ROSTER_PARAMS,
  STARTER_GAP_COEFFICIENT,
} from "@/server/projections/pregame-model";
import { blendRating, dayBefore, restGap, type Personnel, type Rating, type RatingParams, type RatingSums } from "@/lib/projections/ratings";
import { rosterRatings } from "@/server/projections/roster";
import { simulateSeason, type SimGame, type SimTeam } from "@/lib/projections/simulate";
import type { SandboxInputs } from "@/types";

export const SIMULATIONS = 20_000;

// Uncertainty in true team strength (logit scale, before any games), chosen by
// scripts/calibrate-season-sims.ts (see the numbers there and in
// docs/INGESTION_NOTES.md).
export const STRENGTH_SD = 0.25;

/** Seasons of goalie history behind goaltending (earlier ones barely count after decay). */
const GOALIE_SEASONS = 8;

interface SumRow {
  season: number;
  team: string;
  n: number;
  xgd: number;
  gd: number;
}

/** Goalie records up to now: the table behind goaltending and the rows it was built from. */
export async function loadGoalies(db: Queryable, season: number) {
  const rows = await goalieGames(db, season - GOALIE_SEASONS, season, true);
  const table = new GoalieTable(GOALIE_PARAMS);
  for (const game of byGame(rows).values()) table.addGame(game);
  return { table, rows };
}

/** Roster talent and goaltending for every team that has played this season. */
export async function teamPersonnel(db: Queryable, season: number, goalies?: Awaited<ReturnType<typeof loadGoalies>>): Promise<Map<string, Personnel>> {
  const [rosters, g] = await Promise.all([rosterRatings(db, season, ROSTER_PARAMS), goalies ?? loadGoalies(db, season)]);
  const teams = new Set([...rosters.keys(), ...g.rows.filter((r) => r.season === season).map((r) => r.team)]);
  return new Map([...teams].map((t) => [t, { roster: rosters.get(t) ?? 0, goalie: g.table.team(t) }]));
}

export interface RatingInputs {
  /** This season's totals. */
  current: RatingSums;
  /** Last season, per game. */
  prior: Rating | undefined;
  personnel: Personnel | undefined;
}

/** The parts of each team's rating before blending (see ratings.ts). */
export async function teamRatingInputs(db: Queryable, season: number, goalies?: Awaited<ReturnType<typeof loadGoalies>>): Promise<Map<string, RatingInputs>> {
  const personnel = await teamPersonnel(db, season, goalies);
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
  return new Map(
    [...teams].map((team) => {
      const c = current.get(team);
      return [team, { current: { xgd: c?.xgd ?? 0, gd: c?.gd ?? 0, n: c?.n ?? 0 }, prior: prior.get(team), personnel: personnel.get(team) }];
    }),
  );
}

/**
 * Each team's rating: this season's regular-season 5v5 xG and goal
 * differentials blended with last season's, plus roster talent and
 * goaltending (see ratings.ts).
 */
export async function teamRatings(
  db: Queryable,
  season: number,
  params: RatingParams = RATING_PARAMS,
  goalies?: Awaited<ReturnType<typeof loadGoalies>>,
): Promise<Map<string, Rating>> {
  const inputs = await teamRatingInputs(db, season, goalies);
  return new Map([...inputs].map(([team, r]) => [team, blendRating(r.current, r.prior, params, r.personnel)]));
}

/** Regular-season games from `today` on that aren't final, with each one's rest gap. */
export async function remainingGames(db: Queryable, season: number, today: string): Promise<(SimGame & { gameDate: string })[]> {
  const { rows } = await db.query<SimGame & { gameDate: string; final: boolean }>(
    `SELECT game_id AS "gameId", home_team_code AS home, away_team_code AS away, game_date::text AS "gameDate",
            game_state IN ($2, $3) AS final
     FROM games
     WHERE season = $1 AND game_type = $4
     ORDER BY game_date, game_id`,
    [season, GameState.final, GameState.finalAlt, GameState.regularSeason],
  );
  const played = new Set(rows.flatMap((g) => [`${g.home}:${g.gameDate}`, `${g.away}:${g.gameDate}`]));
  const backToBack = (team: string, date: string) => played.has(`${team}:${dayBefore(date)}`);
  return rows
    .filter((g) => !g.final && g.gameDate >= today)
    .map((g) => ({ gameId: g.gameId, home: g.home, away: g.away, gameDate: g.gameDate, rest: restGap(backToBack(g.home, g.gameDate), backToBack(g.away, g.gameDate)) }));
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
 * Simulates the rest of the season from today's standings: the rows to store
 * for `today` (ET). Standings come from the NHL, so they already include last
 * night's results; games before today are excluded so nothing counts twice.
 */
export async function computeProjections(db: Queryable, season: number, today = todayEastern()) {
  const standings = await getStandings();
  if (standings.size < 32) throw new Error(`NHL standings returned ${standings.size} teams`);
  const goalies = await loadGoalies(db, season);
  const [ratingInputs, remaining, injured] = await Promise.all([teamRatingInputs(db, season, goalies), remainingGames(db, season, today), injuredGoalies(db, season)]);
  const ratings = new Map([...ratingInputs].map(([team, r]) => [team, blendRating(r.current, r.prior, RATING_PARAMS, r.personnel)]));
  const teams = simTeams(standings, ratings);
  const tonight = remaining.filter((g) => g.gameDate === today);
  const seed = Number(today.replaceAll("-", ""));
  const options = {
    sims: SIMULATIONS,
    seed,
    coefficients: PREGAME_COEFFICIENTS,
    overtimeRate: OVERTIME_RATE,
    strengthSd: STRENGTH_SD,
    priorGames: RATING_PARAMS.priorGames,
  };
  const { odds, watched } = simulateSeason(teams, remaining, { ...options, watch: tonight.map((g) => g.gameId) });


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
      ratingRoster: fixed(t.rating.roster ?? 0),
      ratingGoalie: fixed(t.rating.goalie ?? 0),
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
  const outlooks = goalieOutlooks(goalies.table, seasonStarts(goalies.rows, season - 1), injured, today);
  const sandbox: SandboxInputs = {
    season,
    runDate: today,
    model: {
      coefficients: PREGAME_COEFFICIENTS,
      priorGames: RATING_PARAMS.priorGames,
      carryOver: RATING_PARAMS.carryOver,
      rosterGames: RATING_PARAMS.rosterGames,
      strengthSd: STRENGTH_SD,
      overtimeRate: OVERTIME_RATE,
      starterGapCoefficient: STARTER_GAP_COEFFICIENT,
    },
    teams: teams.map((t) => {
      const r = ratingInputs.get(t.abbrev);
      const round4 = (v: number) => Number(v.toFixed(4));
      return {
        team: t.abbrev,
        conference: t.conference,
        division: t.division,
        points: t.points,
        gamesPlayed: t.gamesPlayed,
        regulationWins: t.regulationWins,
        season: { xgd: round4(r?.current.xgd ?? 0), gd: r?.current.gd ?? 0, n: r?.current.n ?? 0 },
        prior: r?.prior ? { xgd: round4(r.prior.xgd), gd: round4(r.prior.gd) } : null,
        roster: round4(r?.personnel?.roster ?? 0),
        goalie: round4(r?.personnel?.goalie ?? 0),
        goalieOutlook: outlooks.get(t.abbrev) ?? null,
      };
    }),
    games: remaining.map((g) => ({ gameId: g.gameId, home: g.home, away: g.away, date: g.gameDate, rest: g.rest ?? 0 })),
    injuredGoalies: injured,
  };
  return { oddsRows, gameRows, sandbox, remaining: remaining.length, tonight: tonight.length };
}

/** Simulates the rest of the season and stores the odds for `today` (ET). */
export async function runProjections(db: Queryable, season: number, today = todayEastern()) {
  const { oddsRows, gameRows, sandbox, remaining, tonight } = await computeProjections(db, season, today);
  const written =
    (await upsert(db, playoffOdds, oddsRows, { conflict: ["season", "runDate", "team"] })) +
    (await upsert(db, playoffOddsGames, gameRows, { conflict: ["runDate", "gameId"] })) +
    (await upsert(db, projectionInputs, [{ season, runDate: today, inputs: sandbox }], { conflict: ["season", "runDate"] }));
  // Only the latest inputs are served.
  await db.query(`DELETE FROM projection_inputs WHERE season = $1 AND run_date < $2`, [season, today]);
  return { written, remaining, tonight };
}
