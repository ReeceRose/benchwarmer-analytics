import { and, asc, avg, count, desc, eq, gt, gte, inArray, isNotNull, lt, max, sql, sum as sqlSum, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { queryRows, type Database } from "@/server/db/client";
import {
  goalieSeasons,
  lineCombinations,
  players,
  seasonPercentiles,
  skaterSeasonAdvanced,
  skaterSeasons,
  teamSeasons,
} from "@/server/db/schema";
import type { ApiContext } from "@/server/api/handler";
import { badRequest, HttpError } from "@/server/api/errors";
import { headshotUrl, round } from "@/server/api/format";
import { intRouteParam } from "@/server/api/query";
import { isGoalieCategory, isLeaderboardCategory, NhlConstants } from "@/server/api/constants";
import { currentSeason } from "@/server/ingestion/normalize";

type SkaterSeasonRow = typeof skaterSeasons.$inferSelect;

// Full thresholds apply from the midpoint of the regular season. Before that
// they scale with games played (down to a floor), so early-season pages
// aren't empty.
const FULL_THRESHOLD_GAMES = 41;

// Thresholds scale down for special-teams situations, which have far less ice time.
export function thresholds(situation: string, gamesPlayed: number = FULL_THRESHOLD_GAMES) {
  const evenStrength = situation === "5on5" || situation === "all";
  const progress = Math.min(Math.max(gamesPlayed, 0) / FULL_THRESHOLD_GAMES, 1);
  const scaled = (full: number, floor: number) => Math.max(Math.round(full * progress), floor);
  return {
    minIceTime: evenStrength ? scaled(500 * 60, 50 * 60) : scaled(50 * 60, 5 * 60),
    minGoals: evenStrength ? scaled(10, 2) : scaled(3, 1),
    minLineToi: evenStrength ? scaled(300 * 60, 20 * 60) : scaled(30 * 60, 5 * 60),
    minGoalieGames: scaled(10, 2),
  };
}

// Most regular-season games any team has played in the season.
async function seasonGamesPlayed(db: Database, season: number): Promise<number> {
  const [row] = await db
    .select({ value: max(teamSeasons.gamesPlayed) })
    .from(teamSeasons)
    .where(and(eq(teamSeasons.season, season), eq(teamSeasons.situation, "all"), eq(teamSeasons.isPlayoffs, false)));
  return row?.value ?? 0;
}

async function seasonThresholds(db: Database, season: number, situation: string) {
  return thresholds(situation, await seasonGamesPlayed(db, season));
}

// ORDER BY with NULLs last in both directions (Postgres puts NULLs first for
// DESC by default).
function orderBy(expr: SQL, ascending: boolean): SQL {
  return ascending ? sql`${expr} asc nulls last` : sql`${expr} desc nulls last`;
}

// Regular-season skater rows with their player, for one season/situation.
function skaterBase(db: Database, season: number, situation: string, extra?: SQL) {
  return db
    .select({
      playerId: skaterSeasons.playerId,
      name: players.name,
      team: skaterSeasons.team,
      position: players.position,
      headshotUrl: players.headshotUrl,
      goals: skaterSeasons.goals,
      assists: skaterSeasons.assists,
      expectedGoals: skaterSeasons.expectedGoals,
      corsiForPct: skaterSeasons.corsiForPct,
      iceTimeSeconds: skaterSeasons.iceTimeSeconds,
    })
    .from(skaterSeasons)
    .innerJoin(players, eq(players.id, skaterSeasons.playerId))
    .where(
      and(eq(skaterSeasons.season, season), eq(skaterSeasons.situation, situation), eq(skaterSeasons.isPlayoffs, false), extra),
    );
}

type SkaterBaseRow = Awaited<ReturnType<typeof skaterBase>>[number];

function skaterLeaders(
  db: Database,
  season: number,
  situation: string,
  limit: number,
  order: SQL,
  value: (r: SkaterBaseRow) => number,
  extra?: SQL,
) {
  return skaterBase(db, season, situation, extra)
    .orderBy(order, asc(skaterSeasons.id))
    .limit(limit)
    .then((rows) => rows.map((r) => ({ playerId: r.playerId, name: r.name, team: r.team, position: r.position, value: value(r) })));
}

function outlierEntry(r: SkaterBaseRow) {
  const xg = r.expectedGoals ?? 0;
  return {
    playerId: r.playerId,
    name: r.name,
    team: r.team,
    position: r.position,
    headshotUrl: headshotUrl(r.playerId, r.headshotUrl, r.team),
    goals: r.goals,
    expectedGoals: xg,
    differential: r.goals - xg,
  };
}

// Scoring above (hot) / below (cold) expected goals.
function runningHot(db: Database, season: number, situation: string, limit: number, minGoals: number) {
  const above = sql`${skaterSeasons.goals} - ${skaterSeasons.expectedGoals} > 0`;
  return skaterBase(db, season, situation, and(isNotNull(skaterSeasons.expectedGoals), gte(skaterSeasons.goals, minGoals), above))
    .orderBy(desc(sql`${skaterSeasons.goals} - ${skaterSeasons.expectedGoals}`), asc(skaterSeasons.id))
    .limit(limit)
    .then((rows) => rows.map(outlierEntry));
}

function runningCold(db: Database, season: number, situation: string, limit: number, minGoals: number) {
  // Early in a season few players qualify; without the sign filter, players
  // scoring above expected would fill out the "cold" list.
  const below = sql`${skaterSeasons.goals} - ${skaterSeasons.expectedGoals} < 0`;
  return skaterBase(db, season, situation, and(isNotNull(skaterSeasons.expectedGoals), gte(skaterSeasons.expectedGoals, minGoals), below))
    .orderBy(asc(sql`${skaterSeasons.goals} - ${skaterSeasons.expectedGoals}`), asc(skaterSeasons.id))
    .limit(limit)
    .then((rows) => rows.map(outlierEntry));
}

// Highest-xG% forward lines with enough ice time.
async function topLines(db: Database, season: number, situation: string, limit: number, minLineToi: number) {
  const p1 = alias(players, "p1");
  const p2 = alias(players, "p2");
  const p3 = alias(players, "p3");
  const rows = await db
    .select({
      l: lineCombinations,
      p1: { name: p1.name, position: p1.position },
      p2: { name: p2.name, position: p2.position },
      p3: { name: p3.name, position: p3.position },
    })
    .from(lineCombinations)
    .innerJoin(p1, eq(p1.id, lineCombinations.player1Id))
    .innerJoin(p2, eq(p2.id, lineCombinations.player2Id))
    .innerJoin(p3, eq(p3.id, lineCombinations.player3Id))
    .where(
      and(
        eq(lineCombinations.season, season),
        eq(lineCombinations.situation, situation),
        isNotNull(lineCombinations.player3Id),
        isNotNull(lineCombinations.expectedGoalsPct),
        gte(lineCombinations.iceTimeSeconds, minLineToi),
      ),
    )
    .orderBy(desc(lineCombinations.expectedGoalsPct), asc(lineCombinations.id))
    .limit(limit);
  return rows.map(({ l, p1, p2, p3 }) => ({
    id: l.id,
    team: l.team,
    players: [
      { playerId: l.player1Id, name: p1.name, position: p1.position },
      { playerId: l.player2Id, name: p2.name, position: p2.position },
      { playerId: l.player3Id as number, name: p3.name, position: p3.position },
    ],
    iceTimeSeconds: l.iceTimeSeconds,
    expectedGoalsPct: l.expectedGoalsPct,
    goalsFor: l.goalsFor,
    goalsAgainst: l.goalsAgainst,
  }));
}

// League averages as fractions (0.5 when there is nothing to average).
async function leagueAverages(db: Database, season: number, situation: string, minIceTime: number, minLineToi: number) {
  const [[corsi], [xg]] = await Promise.all([
    db
      .select({ value: avg(skaterSeasons.corsiForPct).mapWith(Number), n: count() })
      .from(skaterSeasons)
      .where(
        and(
          eq(skaterSeasons.season, season),
          eq(skaterSeasons.situation, situation),
          eq(skaterSeasons.isPlayoffs, false),
          isNotNull(skaterSeasons.corsiForPct),
          gte(skaterSeasons.iceTimeSeconds, minIceTime),
        ),
      ),
    db
      .select({ value: avg(lineCombinations.expectedGoalsPct).mapWith(Number), n: count() })
      .from(lineCombinations)
      .where(
        and(
          eq(lineCombinations.season, season),
          eq(lineCombinations.situation, situation),
          isNotNull(lineCombinations.expectedGoalsPct),
          gte(lineCombinations.iceTimeSeconds, minLineToi),
        ),
      ),
  ]);
  return {
    corsiPct: corsi.n > 0 ? corsi.value : 0.5,
    expectedGoalsPct: xg.n > 0 ? xg.value : 0.5,
  };
}

// Regular-season "all" goalie rows with at least minGames GP.
function goalieBase(db: Database, season: number, minGames: number, extra: SQL | undefined) {
  return db
    .select({
      playerId: goalieSeasons.playerId,
      name: players.name,
      team: goalieSeasons.team,
      headshotUrl: players.headshotUrl,
      goalsAgainst: goalieSeasons.goalsAgainst,
      expectedGoalsAgainst: goalieSeasons.expectedGoalsAgainst,
      savePercentage: goalieSeasons.savePercentage,
      goalsAgainstAverage: goalieSeasons.goalsAgainstAverage,
      goalsSavedAboveExpected: goalieSeasons.goalsSavedAboveExpected,
    })
    .from(goalieSeasons)
    .innerJoin(players, eq(players.id, goalieSeasons.playerId))
    .where(
      and(
        eq(goalieSeasons.season, season),
        eq(goalieSeasons.situation, "all"),
        eq(goalieSeasons.isPlayoffs, false),
        gte(goalieSeasons.gamesPlayed, minGames),
        extra,
      ),
    );
}

async function goalieLeaders(db: Database, season: number, limit: number, minGames: number) {
  const leader = (value: (r: Awaited<ReturnType<typeof goalieBase>>[number]) => number | null) =>
    (r: Awaited<ReturnType<typeof goalieBase>>[number]) => ({
      playerId: r.playerId,
      name: r.name,
      team: r.team,
      position: "G",
      value: value(r) ?? 0,
    });
  const [savePct, gaa, gsax] = await Promise.all([
    goalieBase(db, season, minGames, isNotNull(goalieSeasons.savePercentage))
      .orderBy(desc(goalieSeasons.savePercentage), asc(goalieSeasons.id))
      .limit(limit),
    goalieBase(db, season, minGames, isNotNull(goalieSeasons.goalsAgainstAverage))
      .orderBy(asc(goalieSeasons.goalsAgainstAverage), asc(goalieSeasons.id))
      .limit(limit),
    goalieBase(db, season, minGames, isNotNull(goalieSeasons.goalsSavedAboveExpected))
      .orderBy(desc(goalieSeasons.goalsSavedAboveExpected), asc(goalieSeasons.id))
      .limit(limit),
  ]);
  return {
    savePct: savePct.map(leader((r) => r.savePercentage)),
    goalsAgainstAvg: gaa.map(leader((r) => r.goalsAgainstAverage)),
    goalsSavedAboveExpected: gsax.map(leader((r) => r.goalsSavedAboveExpected)),
  };
}

async function goalieOutliers(db: Database, season: number, limit: number, minGames: number) {
  const filter = and(isNotNull(goalieSeasons.goalsSavedAboveExpected), isNotNull(goalieSeasons.expectedGoalsAgainst));
  const entry = (r: Awaited<ReturnType<typeof goalieBase>>[number]) => ({
    playerId: r.playerId,
    name: r.name,
    team: r.team,
    headshotUrl: headshotUrl(r.playerId, r.headshotUrl, r.team),
    goalsAgainst: r.goalsAgainst,
    expectedGoalsAgainst: r.expectedGoalsAgainst ?? 0,
    goalsSavedAboveExpected: r.goalsSavedAboveExpected ?? 0,
  });
  const [hot, cold] = await Promise.all([
    goalieBase(db, season, minGames, and(filter, gt(goalieSeasons.goalsSavedAboveExpected, 0)))
      .orderBy(desc(goalieSeasons.goalsSavedAboveExpected), asc(goalieSeasons.id))
      .limit(limit),
    goalieBase(db, season, minGames, and(filter, lt(goalieSeasons.goalsSavedAboveExpected, 0)))
      .orderBy(asc(goalieSeasons.goalsSavedAboveExpected), asc(goalieSeasons.id))
      .limit(limit),
  ]);
  return { runningHot: hot.map(entry), runningCold: cold.map(entry) };
}

export async function getHomepage({ db, query }: ApiContext) {
  const season = query.int("season") ?? currentSeason();
  const situation = query.string("situation") ?? "5on5";
  const { minIceTime, minGoals, minLineToi, minGoalieGames } = await seasonThresholds(db, season, situation);
  const n = 5;

  const [points, goals, xg, corsi, iceTime, hot, cold, lines, averages, goalies, goalieOut] = await Promise.all([
    skaterLeaders(db, season, situation, n, desc(sql`${skaterSeasons.goals} + ${skaterSeasons.assists}`), (r) => r.goals + r.assists),
    skaterLeaders(db, season, situation, n, desc(skaterSeasons.goals), (r) => r.goals),
    skaterLeaders(db, season, situation, n, desc(skaterSeasons.expectedGoals), (r) => r.expectedGoals ?? 0, isNotNull(skaterSeasons.expectedGoals)),
    skaterLeaders(
      db, season, situation, n, desc(skaterSeasons.corsiForPct), (r) => r.corsiForPct ?? 0,
      and(isNotNull(skaterSeasons.corsiForPct), gte(skaterSeasons.iceTimeSeconds, minIceTime)),
    ),
    skaterLeaders(db, season, situation, n, desc(skaterSeasons.iceTimeSeconds), (r) => r.iceTimeSeconds),
    runningHot(db, season, situation, 15, minGoals),
    runningCold(db, season, situation, 15, minGoals),
    topLines(db, season, situation, 5, minLineToi),
    leagueAverages(db, season, situation, minIceTime, minLineToi),
    goalieLeaders(db, season, n, minGoalieGames),
    goalieOutliers(db, season, 15, minGoalieGames),
  ]);

  return {
    season,
    situation,
    leaders: { points, goals, expectedGoals: xg, corsiPct: corsi, iceTime },
    outliers: { runningHot: hot, runningCold: cold },
    topLines: lines,
    leagueAverages: averages,
    goalieLeaders: goalies,
    goalieOutliers: goalieOut,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export async function getOutliers({ db, query }: ApiContext) {
  const season = query.int("season") ?? currentSeason();
  const situation = query.string("situation") ?? "5on5";
  const skaterLimit = clamp(query.int("skaterLimit") ?? 15, 1, 50);
  const goalieLimit = clamp(query.int("goalieLimit") ?? 5, 1, 20);
  const { minIceTime, minGoals, minLineToi, minGoalieGames } = await seasonThresholds(db, season, situation);

  const [hot, cold, averages, goalies] = await Promise.all([
    runningHot(db, season, situation, skaterLimit, minGoals),
    runningCold(db, season, situation, skaterLimit, minGoals),
    leagueAverages(db, season, situation, minIceTime, minLineToi),
    goalieOutliers(db, season, goalieLimit, minGoalieGames),
  ]);
  return {
    season,
    situation,
    skaterOutliers: { runningHot: hot, runningCold: cold },
    goalieOutliers: goalies,
    leagueAverages: averages,
  };
}

export async function getTopLines({ db, query }: ApiContext) {
  const season = query.int("season") ?? currentSeason();
  const situation = query.string("situation") ?? "5on5";
  const limit = clamp(query.int("limit") ?? 5, 1, 20);
  const { minLineToi } = await seasonThresholds(db, season, situation);
  return { season, situation, lines: await topLines(db, season, situation, limit, minLineToi) };
}

type ScoreInput = Pick<SkaterSeasonRow, "goals" | "assists" | "shots" | "iceTimeSeconds" | "expectedGoals" | "corsiForPct">;

function shotsPer60(s: Pick<SkaterSeasonRow, "shots" | "iceTimeSeconds">): number {
  return s.iceTimeSeconds > 0 ? (s.shots / s.iceTimeSeconds) * 3600 : 0;
}

// corsi_for_pct is stored as MoneyPuck's fraction (0.55); the scores work in
// percentage points (55), with 50 when it's missing.
function corsiPoints(s: Pick<SkaterSeasonRow, "corsiForPct">): number {
  return s.corsiForPct == null ? 50 : s.corsiForPct * 100;
}

// Higher = more likely to break out: scoring below xG, good possession, high shot rate.
export function breakoutScore(s: ScoreInput): number {
  const xgDiff = (s.expectedGoals ?? 0) - s.goals;
  const corsiBonus = (corsiPoints(s) - 50) / 10;
  const shotBonus = (shotsPer60(s) - 7) / 3;
  return round(xgDiff + corsiBonus + shotBonus, 2);
}

// Production (2x points, 1.5x goals above xG; defensemen x1.3) + possession and
// shot rate + 2 points per year younger than 22.
export function rookieScore(s: ScoreInput, position: string | null, age: number): number {
  const points = s.goals + s.assists;
  const xgDiff = s.goals - (s.expectedGoals ?? 0);
  const corsiBonus = (corsiPoints(s) - 50) / 5;
  const shotBonus = shotsPer60(s) / 3;
  const multiplier = position === "D" ? 1.3 : 1;
  const ageBonus = (22 - age) * 2;
  return round(points * 2 * multiplier + xgDiff * 1.5 * multiplier + corsiBonus + shotBonus + ageBonus, 2);
}

// Age as of September 15 of the season year (NHL eligibility rules).
export function ageAsOfSept15(birthDate: string, season: number): number {
  const [year, month, day] = birthDate.split("-").map(Number);
  let age = season - year;
  const md = month * 100 + day;
  const cutoff = NhlConstants.ageCalculationMonth * 100 + NhlConstants.ageCalculationDay;
  if (md > cutoff) age--;
  return age;
}

export async function getBreakoutCandidates({ db, query }: ApiContext) {
  const season = query.int("season") ?? currentSeason();
  const minGames = query.int("minGames") ?? 20;
  const limit = clamp(query.int("limit") ?? 50, 1, 100);

  const rows = await db
    .select({ s: skaterSeasons, name: players.name, position: players.position })
    .from(skaterSeasons)
    .innerJoin(players, eq(players.id, skaterSeasons.playerId))
    .where(
      and(
        eq(skaterSeasons.season, season),
        eq(skaterSeasons.situation, "all"),
        eq(skaterSeasons.isPlayoffs, false),
        gte(skaterSeasons.gamesPlayed, minGames),
        sql`${skaterSeasons.expectedGoals} > 0`,
        isNotNull(skaterSeasons.corsiForPct),
      ),
    )
    .orderBy(desc(sql`${skaterSeasons.expectedGoals} - ${skaterSeasons.goals}`), desc(skaterSeasons.corsiForPct), asc(skaterSeasons.id))
    .limit(limit);

  return {
    season,
    minGamesPlayed: minGames,
    candidates: rows.map(({ s, name, position }) => ({
      playerId: s.playerId,
      name,
      team: s.team,
      position,
      gamesPlayed: s.gamesPlayed,
      goals: s.goals,
      assists: s.assists,
      shots: s.shots,
      expectedGoals: round(s.expectedGoals ?? 0, 2),
      goalsDifferential: round((s.expectedGoals ?? 0) - s.goals, 2),
      corsiForPct: s.corsiForPct,
      fenwickForPct: s.fenwickForPct,
      shotsPer60: round(shotsPer60(s), 2),
      breakoutScore: breakoutScore(s),
    })),
  };
}

// Per-60 rates by age across all seasons; mean (or median) with quartiles.
export async function getAgeCurves({ db, query }: ApiContext) {
  const minGames = query.int("minGames") ?? 20;
  const useMedian = query.bool("useMedian") ?? false;
  const playerIds = [
    ...new Set(
      (query.string("playerIds") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => /^[+-]?\d+$/.test(s))
        .map(Number),
    ),
  ].slice(0, 5);

  const center = (column: string) =>
    useMedian
      ? sql.raw(`round(percentile_cont(0.5) within group (order by ${column})::numeric, 2)`)
      : sql.raw(`round(avg(${column})::numeric, 2)`);
  const quartile = (p: number, column: string) =>
    sql.raw(`round(percentile_cont(${p}) within group (order by ${column})::numeric, 2)`);

  const league = await queryRows<Record<string, string | number>>(db, sql`
    select age,
      ${center("points_per_60")} as points_per_60,
      ${center("goals_per_60")} as goals_per_60,
      ${center("xg_per_60")} as xg_per_60,
      ${quartile(0.25, "points_per_60")} as points_p25,
      ${quartile(0.75, "points_per_60")} as points_p75,
      ${quartile(0.25, "goals_per_60")} as goals_p25,
      ${quartile(0.75, "goals_per_60")} as goals_p75,
      ${quartile(0.25, "xg_per_60")} as xg_p25,
      ${quartile(0.75, "xg_per_60")} as xg_p75,
      count(*)::int as player_count
    from (
      select s.season - extract(year from p.birth_date)::int as age,
        (s.goals + s.assists) / (s.ice_time_seconds / 3600.0) as points_per_60,
        s.goals / (s.ice_time_seconds / 3600.0) as goals_per_60,
        coalesce(s.expected_goals, 0) / (s.ice_time_seconds / 3600.0) as xg_per_60
      from skater_seasons s join players p on s.player_id = p.id
      where s.situation = 'all' and s.is_playoffs = false and s.games_played >= ${minGames}
        and s.ice_time_seconds > 3600 and p.birth_date is not null
    ) sub
    where age between 18 and 45
    group by age
    order by age
  `);

  const leagueCurve = league.map((r) => ({
    age: Number(r.age),
    season: null,
    pointsPer60: Number(r.points_per_60),
    goalsPer60: Number(r.goals_per_60),
    xgPer60: Number(r.xg_per_60),
    sampleSize: Number(r.player_count),
    pointsPer60P25: Number(r.points_p25),
    pointsPer60P75: Number(r.points_p75),
    goalsPer60P25: Number(r.goals_p25),
    goalsPer60P75: Number(r.goals_p75),
    xgPer60P25: Number(r.xg_p25),
    xgPer60P75: Number(r.xg_p75),
  }));

  const playerCurves = [];
  for (const playerId of playerIds) {
    const [player] = await db
      .select({ name: players.name, birthDate: players.birthDate })
      .from(players)
      .where(eq(players.id, playerId));
    if (!player) continue;
    playerCurves.push({ playerId, playerName: player.name, dataPoints: await playerAgeCurve(db, playerId, player.birthDate) });
  }

  return { minGamesPlayed: minGames, useMedian, leagueCurve, playerCurves };
}

// Per-60 rate rounded to 2 dp.
function per60(value: number, minutes: number): number {
  return round((value / minutes) * 60, 2);
}

async function playerAgeCurve(db: Database, playerId: number, birthDate: string | null) {
  if (!birthDate) return [];
  const birthYear = Number(birthDate.slice(0, 4));
  const rows = await db
    .select()
    .from(skaterSeasons)
    .where(
      and(
        eq(skaterSeasons.playerId, playerId),
        eq(skaterSeasons.situation, "all"),
        eq(skaterSeasons.isPlayoffs, false),
        sql`${skaterSeasons.iceTimeSeconds} > 0`,
      ),
    )
    .orderBy(asc(skaterSeasons.season), asc(skaterSeasons.id));
  return rows
    .map((s) => {
      const minutes = s.iceTimeSeconds / 60;
      return {
        age: s.season - birthYear,
        season: s.season,
        pointsPer60: per60(s.goals + s.assists, minutes),
        goalsPer60: per60(s.goals, minutes),
        xgPer60: per60(s.expectedGoals ?? 0, minutes),
        sampleSize: s.gamesPlayed,
        pointsPer60P25: null,
        pointsPer60P75: null,
        goalsPer60P25: null,
        goalsPer60P75: null,
        xgPer60P25: null,
        xgPer60P75: null,
      };
    })
    .sort((a, b) => a.age - b.age);
}

export async function getAgeDistribution({ db, params, query }: ApiContext) {
  const age = intRouteParam(params.age);
  if (age === undefined) throw new HttpError(404, { error: "Not found", code: "NOT_FOUND" });
  if (age < 18 || age > 45) badRequest("Age must be between 18 and 45");
  const minGames = query.int("minGames") ?? 20;

  const rows = await db
    .select({
      goals: skaterSeasons.goals,
      assists: skaterSeasons.assists,
      expectedGoals: skaterSeasons.expectedGoals,
      iceTimeSeconds: skaterSeasons.iceTimeSeconds,
      gamesPlayed: skaterSeasons.gamesPlayed,
    })
    .from(skaterSeasons)
    .innerJoin(players, eq(players.id, skaterSeasons.playerId))
    .where(
      and(
        eq(skaterSeasons.situation, "all"),
        eq(skaterSeasons.isPlayoffs, false),
        gte(skaterSeasons.gamesPlayed, minGames),
        sql`${skaterSeasons.iceTimeSeconds} > 3600`,
        isNotNull(players.birthDate),
        sql`${skaterSeasons.season} - extract(year from ${players.birthDate})::int = ${age}`,
      ),
    )
    .orderBy(asc(skaterSeasons.id));

  return {
    age,
    minGamesPlayed: minGames,
    dataPoints: rows.map((s) => {
      const minutes = s.iceTimeSeconds / 60;
      return {
        pointsPer60: per60(s.goals + s.assists, minutes),
        goalsPer60: per60(s.goals, minutes),
        xgPer60: per60(s.expectedGoals ?? 0, minutes),
        gamesPlayed: s.gamesPlayed,
      };
    }),
  };
}

// 1st-99th percentile thresholds by linear interpolation, 3 dp.
export function percentileThresholds(sorted: readonly number[]): number[] {
  const n = sorted.length;
  const thresholdsList: number[] = [];
  for (let p = 1; p <= 99; p++) {
    const rank = (p / 100) * (n - 1);
    const lower = Math.floor(rank);
    const upper = Math.ceil(rank);
    if (lower === upper || upper >= n) {
      thresholdsList.push(round(sorted[Math.min(lower, n - 1)], 3));
    } else {
      thresholdsList.push(round(sorted[lower] + (rank - lower) * (sorted[upper] - sorted[lower]), 3));
    }
  }
  return thresholdsList;
}

// Game Score per game thresholds. Not in the season_percentiles view (changing
// it needs a migration); it's one small query over the season's skaters.
async function gameScorePercentiles(db: Database, season: number, minGames: number): Promise<number[]> {
  const rows = await db
    .select({ value: sql<number>`${skaterSeasonAdvanced.gameScore} / ${skaterSeasons.gamesPlayed}`.mapWith(Number) })
    .from(skaterSeasons)
    .innerJoin(
      skaterSeasonAdvanced,
      and(
        eq(skaterSeasonAdvanced.playerId, skaterSeasons.playerId),
        eq(skaterSeasonAdvanced.season, skaterSeasons.season),
        eq(skaterSeasonAdvanced.team, skaterSeasons.team),
        eq(skaterSeasonAdvanced.situation, skaterSeasons.situation),
        eq(skaterSeasonAdvanced.isPlayoffs, skaterSeasons.isPlayoffs),
      ),
    )
    .where(
      and(
        eq(skaterSeasons.season, season),
        eq(skaterSeasons.situation, "all"),
        eq(skaterSeasons.isPlayoffs, false),
        gte(skaterSeasons.gamesPlayed, Math.max(minGames, 1)),
        sql`${skaterSeasons.iceTimeSeconds} > 0`,
        isNotNull(skaterSeasonAdvanced.gameScore),
      ),
    );
  if (rows.length === 0) return [];
  return percentileThresholds(rows.map((r) => r.value).sort((a, b) => a - b));
}

export async function getSeasonPercentiles({ db, params, query }: ApiContext) {
  const season = intRouteParam(params.season);
  if (season === undefined) throw new HttpError(404, { error: "Not found", code: "NOT_FOUND" });
  const minGames = query.int("minGames") ?? 20;
  const empty = {
    season, minGames, playerCount: 0, pointsPerGame: [], goalsPerGame: [], pointsPer60: [], goalsPer60: [], gameScorePerGame: [],
  };

  // minGames = 20 is precomputed in the season_percentiles materialized view.
  if (minGames === 20) {
    const [rows, gameScorePerGame] = await Promise.all([
      db
        .select()
        .from(seasonPercentiles)
        .where(eq(seasonPercentiles.season, season))
        .orderBy(asc(seasonPercentiles.percentile)),
      gameScorePercentiles(db, season, minGames),
    ]);
    if (rows.length === 0) return empty;
    return {
      season,
      minGames: 20,
      playerCount: rows[0].playerCount,
      pointsPerGame: rows.map((r) => r.pointsPerGame),
      goalsPerGame: rows.map((r) => r.goalsPerGame),
      pointsPer60: rows.map((r) => r.pointsPer60),
      goalsPer60: rows.map((r) => r.goalsPer60),
      gameScorePerGame,
    };
  }

  const [rows, gameScorePerGame] = await Promise.all([
    db
      .select({
        gamesPlayed: skaterSeasons.gamesPlayed,
        goals: skaterSeasons.goals,
        assists: skaterSeasons.assists,
        iceTimeSeconds: skaterSeasons.iceTimeSeconds,
      })
      .from(skaterSeasons)
      .where(
        and(
          eq(skaterSeasons.season, season),
          eq(skaterSeasons.situation, "all"),
          eq(skaterSeasons.isPlayoffs, false),
          gte(skaterSeasons.gamesPlayed, minGames),
          sql`${skaterSeasons.iceTimeSeconds} > 0`,
        ),
      ),
    gameScorePercentiles(db, season, minGames),
  ]);
  const statsList = rows
    .filter((r) => r.gamesPlayed > 0 && r.iceTimeSeconds > 0)
    .map((r) => {
      const minutes = r.iceTimeSeconds / 60;
      const points = r.goals + r.assists;
      return {
        pointsPerGame: points / r.gamesPlayed,
        goalsPerGame: r.goals / r.gamesPlayed,
        pointsPer60: (points / minutes) * 60,
        goalsPer60: (r.goals / minutes) * 60,
      };
    });
  if (statsList.length === 0) return empty;
  const sortedBy = (key: keyof (typeof statsList)[number]) => statsList.map((s) => s[key]).sort((a, b) => a - b);

  return {
    season,
    minGames,
    playerCount: statsList.length,
    pointsPerGame: percentileThresholds(sortedBy("pointsPerGame")),
    goalsPerGame: percentileThresholds(sortedBy("goalsPerGame")),
    pointsPer60: percentileThresholds(sortedBy("pointsPer60")),
    goalsPer60: percentileThresholds(sortedBy("goalsPer60")),
    gameScorePerGame,
  };
}

const CATEGORY_HELP =
  "Valid categories: points, goals, assists, expectedGoals, corsiPct, iceTime, gamesPlayed, gameScore, savePct, gaa, gsax, shotsAgainst";

const NO_SKATER_FIELDS = {
  goals: null, assists: null, shots: null, expectedGoals: null, expectedGoalsPer60: null, corsiForPct: null,
  fenwickForPct: null, onIceShootingPct: null, onIceSavePct: null, iceTimeSeconds: null, gameScorePerGame: null,
};

const NO_GOALIE_FIELDS = {
  savePercentage: null, goalsAgainstAverage: null, goalsSavedAboveExpected: null, shotsAgainst: null,
  goalieIceTimeSeconds: null, goalsAgainst: null, expectedGoalsAgainst: null, highDangerShots: null,
  highDangerGoals: null, mediumDangerShots: null, mediumDangerGoals: null, lowDangerShots: null,
  lowDangerGoals: null, rebounds: null, expectedRebounds: null,
};

async function skaterLeaderboard(db: Database, category: string, season: number, situation: string, limit: number, ascending: boolean) {
  const adv = skaterSeasonAdvanced;
  // Game Score comes from the "all" row whatever the situation: MoneyPuck's
  // per-situation values aren't meaningful (see docs/INGESTION_NOTES.md).
  const advAll = alias(skaterSeasonAdvanced, "adv_all");
  const faceoffPct = sql<number | null>`case when ${adv.faceoffsWon} is not null and ${adv.faceoffsLost} is not null
    and ${adv.faceoffsWon} + ${adv.faceoffsLost} > 0
    then ${adv.faceoffsWon} / (${adv.faceoffsWon} + ${adv.faceoffsLost}) * 100 end`.mapWith(Number);
  const gameScorePerGame = sql<number | null>`${advAll.gameScore} / nullif(${skaterSeasons.gamesPlayed}, 0)`.mapWith(Number);

  const filters: (SQL | undefined)[] = [
    eq(skaterSeasons.season, season),
    eq(skaterSeasons.situation, situation),
    eq(skaterSeasons.isPlayoffs, false),
  ];
  // Rate stats need a minimum of ice time.
  if (category === "corsipct" || category === "gamescore") {
    const { minIceTime } = await seasonThresholds(db, season, situation);
    filters.push(gte(skaterSeasons.iceTimeSeconds, minIceTime));
  }
  // Faceoff % needs at least 100 faceoffs taken.
  if (category === "faceoffpct") filters.push(sql`${adv.faceoffsWon} + ${adv.faceoffsLost} >= 100`);
  const where = and(...filters);

  const points = sql`${skaterSeasons.goals} + ${skaterSeasons.assists}`;
  const orderColumns: Record<string, SQL> = {
    points,
    goals: sql`${skaterSeasons.goals}`,
    assists: sql`${skaterSeasons.assists}`,
    shots: sql`${skaterSeasons.shots}`,
    expectedgoals: sql`coalesce(${skaterSeasons.expectedGoals}, 0)`,
    xgper60: sql`${skaterSeasons.expectedGoalsPer60}`,
    corsipct: sql`coalesce(${skaterSeasons.corsiForPct}, 0)`,
    fenwickpct: sql`${skaterSeasons.fenwickForPct}`,
    oishpct: sql`${skaterSeasons.onIceShootingPct}`,
    oisvpct: sql`${skaterSeasons.onIceSavePct}`,
    icetime: sql`${skaterSeasons.iceTimeSeconds}`,
    gamesplayed: sql`${skaterSeasons.gamesPlayed}`,
    faceoffpct: sql`${faceoffPct}`,
    gamescore: sql`${gameScorePerGame}`,
  };

  // Advanced stats are matched by player/season/situation (not team).
  const joinAdvanced = and(
    eq(adv.playerId, skaterSeasons.playerId),
    eq(adv.season, skaterSeasons.season),
    eq(adv.situation, skaterSeasons.situation),
    eq(adv.isPlayoffs, skaterSeasons.isPlayoffs),
  );
  const joinAdvancedAll = and(
    eq(advAll.playerId, skaterSeasons.playerId),
    eq(advAll.season, skaterSeasons.season),
    eq(advAll.situation, "all"),
    eq(advAll.isPlayoffs, skaterSeasons.isPlayoffs),
  );
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ s: skaterSeasons, name: players.name, position: players.position, faceoffPct, gameScorePerGame })
      .from(skaterSeasons)
      .innerJoin(players, eq(players.id, skaterSeasons.playerId))
      .leftJoin(adv, joinAdvanced)
      .leftJoin(advAll, joinAdvancedAll)
      .where(where)
      .orderBy(orderBy(orderColumns[category] ?? points, ascending), asc(skaterSeasons.id))
      .limit(limit),
    db
      .select({ total: count() })
      .from(skaterSeasons)
      .innerJoin(players, eq(players.id, skaterSeasons.playerId))
      .leftJoin(adv, joinAdvanced)
      .where(where),
  ]);

  const entries = rows.map(({ s, name, position, faceoffPct: fo, gameScorePerGame: gs }, i) => {
    const xg = s.expectedGoals ?? 0;
    const corsi = s.corsiForPct ?? 0;
    const primary: Record<string, number> = {
      points: s.goals + s.assists,
      goals: s.goals,
      assists: s.assists,
      shots: s.shots,
      expectedgoals: xg,
      xgper60: s.expectedGoalsPer60 ?? 0,
      corsipct: corsi,
      fenwickpct: s.fenwickForPct ?? 0,
      oishpct: s.onIceShootingPct ?? 0,
      oisvpct: s.onIceSavePct ?? 0,
      icetime: s.iceTimeSeconds,
      gamesplayed: s.gamesPlayed,
      faceoffpct: fo ?? 0,
      gamescore: gs == null ? 0 : round(gs, 2),
    };
    return {
      rank: i + 1,
      playerId: s.playerId,
      name,
      team: s.team,
      position,
      primaryValue: primary[category] ?? primary.points,
      gamesPlayed: s.gamesPlayed,
      goals: s.goals,
      assists: s.assists,
      shots: s.shots,
      expectedGoals: xg,
      expectedGoalsPer60: s.expectedGoalsPer60,
      corsiForPct: corsi,
      fenwickForPct: s.fenwickForPct,
      onIceShootingPct: s.onIceShootingPct,
      onIceSavePct: s.onIceSavePct,
      iceTimeSeconds: s.iceTimeSeconds,
      faceoffPct: fo == null ? undefined : round(fo, 1),
      gameScorePerGame: gs == null ? null : round(gs, 2),
      ...NO_GOALIE_FIELDS,
    };
  });
  return { total, entries };
}

async function goalieLeaderboard(db: Database, category: string, season: number, limit: number, ascending: boolean) {
  const g = goalieSeasons;
  const { minGoalieGames } = await seasonThresholds(db, season, "all");
  const base = and(
    eq(g.season, season),
    eq(g.situation, "all"),
    eq(g.isPlayoffs, false),
    gte(g.gamesPlayed, minGoalieGames),
  );
  const reboundRatio = sql`${g.rebounds}::numeric / ${g.expectedRebounds}`;
  // Each category sorts by its own value.
  const orderColumns: Record<string, SQL> = {
    savepct: sql`coalesce(${g.savePercentage}, 0)`,
    gaa: sql`coalesce(${g.goalsAgainstAverage}, 0)`,
    gsax: sql`coalesce(${g.goalsSavedAboveExpected}, 0)`,
    shotsagainst: sql`${g.shotsAgainst}`,
    goalietime: sql`${g.iceTimeSeconds}`,
    goalsagainst: sql`${g.goalsAgainst}`,
    xga: sql`coalesce(${g.expectedGoalsAgainst}, 0)`,
    reboundcontrol: reboundRatio,
  };
  const where = category === "reboundcontrol" ? and(base, sql`coalesce(${g.expectedRebounds}, 0) > 0`) : base;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ g, name: players.name })
      .from(g)
      .innerJoin(players, eq(players.id, g.playerId))
      .where(where)
      .orderBy(orderBy(orderColumns[category] ?? orderColumns.savepct, ascending), asc(g.id))
      .limit(limit),
    db.select({ total: count() }).from(g).innerJoin(players, eq(players.id, g.playerId)).where(base),
  ]);

  const entries = rows.map(({ g: r, name }, i) => {
    const savePct = r.savePercentage ?? 0;
    const gaa = r.goalsAgainstAverage ?? 0;
    const gsax = r.goalsSavedAboveExpected ?? 0;
    const xga = r.expectedGoalsAgainst ?? 0;
    const expectedRebounds = r.expectedRebounds ?? 0;
    const primary: Record<string, number> = {
      savepct: savePct,
      gaa,
      gsax,
      shotsagainst: r.shotsAgainst,
      goalietime: r.iceTimeSeconds,
      goalsagainst: r.goalsAgainst,
      xga,
      reboundcontrol: expectedRebounds > 0 ? round(r.rebounds / expectedRebounds, 2) : 0,
    };
    return {
      rank: i + 1,
      playerId: r.playerId,
      name,
      team: r.team,
      position: "G",
      primaryValue: primary[category] ?? savePct,
      gamesPlayed: r.gamesPlayed,
      ...NO_SKATER_FIELDS,
      savePercentage: savePct,
      goalsAgainstAverage: gaa,
      goalsSavedAboveExpected: gsax,
      shotsAgainst: r.shotsAgainst,
      goalieIceTimeSeconds: r.iceTimeSeconds,
      goalsAgainst: r.goalsAgainst,
      expectedGoalsAgainst: xga,
      highDangerShots: r.highDangerShots,
      highDangerGoals: r.highDangerGoals,
      mediumDangerShots: r.mediumDangerShots,
      mediumDangerGoals: r.mediumDangerGoals,
      lowDangerShots: r.lowDangerShots,
      lowDangerGoals: r.lowDangerGoals,
      rebounds: r.rebounds,
      expectedRebounds,
    };
  });
  return { total, entries };
}

export async function getLeaderboard({ db, query }: ApiContext) {
  const category = query.string("category");
  if (!category?.trim()) badRequest(`Category is required. ${CATEGORY_HELP}`);
  if (!isLeaderboardCategory(category)) badRequest(`Invalid category '${category}'. ${CATEGORY_HELP}`);
  const season = query.int("season") ?? currentSeason();
  const situation = query.string("situation") ?? "all";
  const limit = clamp(query.int("limit") ?? 50, 1, 100);
  const ascending = query.string("sortDir")?.toLowerCase() === "asc";

  const key = category.toLowerCase();
  const { total, entries } = isGoalieCategory(key)
    ? await goalieLeaderboard(db, key, season, limit, ascending)
    : await skaterLeaderboard(db, key, season, situation, limit, ascending);
  return { category, season, situation, totalCount: total, entries };
}

export async function getRookies({ db, query }: ApiContext) {
  const season = query.int("season") ?? currentSeason();
  const minGames = query.int("minGames") ?? 10;
  const limit = clamp(query.int("limit") ?? 50, 1, 100);
  const raw = query.string("position")?.toUpperCase();
  const position = raw === "F" || raw === "FORWARDS" ? "F" : raw === "D" || raw === "DEFENSE" || raw === "DEFENSEMEN" ? "D" : null;

  // NHL rookie rules: no prior season with 26+ GP, and under 26 on Sept 15.
  const positionFilter =
    position === "F" ? sql`and p.position in ('C', 'LW', 'RW')` : position === "D" ? sql`and p.position = 'D'` : sql``;
  const idRows = await queryRows<{ id: number }>(db, sql`
    select ss.id
    from skater_seasons ss join players p on ss.player_id = p.id
    where ss.season = ${season} and ss.situation = 'all' and ss.is_playoffs = false
      and ss.games_played >= ${minGames} and p.birth_date is not null
      ${positionFilter}
      and not exists (
        select 1 from skater_seasons prior
        where prior.player_id = ss.player_id and prior.season < ss.season
          and prior.situation = 'all' and prior.is_playoffs = false
          and prior.games_played >= ${NhlConstants.rookieMaxPriorGames}
      )
      and extract(year from age(make_date(${season}, 9, 15), p.birth_date)) < ${NhlConstants.rookieMaxAge}
    order by (ss.goals + ss.assists) desc, ss.id
    limit ${limit}
  `);
  const ids = idRows.map((r) => Number(r.id));
  if (ids.length === 0) return { season, minGamesPlayed: minGames, positionFilter: position, rookies: [] };

  const rows = await db
    .select({ s: skaterSeasons, name: players.name, position: players.position, birthDate: players.birthDate, headshot: players.headshotUrl })
    .from(skaterSeasons)
    .innerJoin(players, eq(players.id, skaterSeasons.playerId))
    .where(inArray(skaterSeasons.id, ids));
  const order = new Map(ids.map((id, i) => [id, i]));
  rows.sort((a, b) => (order.get(a.s.id) ?? 0) - (order.get(b.s.id) ?? 0));

  return {
    season,
    minGamesPlayed: minGames,
    positionFilter: position,
    rookies: rows.map(({ s, name, position: pos, birthDate, headshot }) => {
      const age = birthDate ? ageAsOfSept15(birthDate, season) : 0;
      return {
        playerId: s.playerId,
        name,
        team: s.team,
        position: pos,
        headshotUrl: headshotUrl(s.playerId, headshot, s.team),
        age,
        gamesPlayed: s.gamesPlayed,
        goals: s.goals,
        assists: s.assists,
        points: s.goals + s.assists,
        shots: s.shots,
        expectedGoals: round(s.expectedGoals ?? 0, 2),
        goalsDifferential: round(s.goals - (s.expectedGoals ?? 0), 2),
        corsiForPct: s.corsiForPct,
        fenwickForPct: s.fenwickForPct,
        shotsPer60: round(shotsPer60(s), 2),
        iceTimeSeconds: s.iceTimeSeconds,
        rookieScore: rookieScore(s, pos, age),
      };
    }),
  };
}

export interface TeamTrendTotals {
  season: number;
  teamGames: number;
  goals: number;
  shots: number;
  xGoals: number;
  weightedCorsi: number;
  iceTime: number;
}

export interface SkaterTrendTotals {
  players: number;
  playerGames: number;
  assists: number;
  iceTimeSeconds: number;
}

export function seasonTrend(t: TeamTrendTotals, s: SkaterTrendTotals | undefined) {
  // Corsi % may be stored as a ratio (0.51) or a percentage (51.0).
  const rawCorsi = t.iceTime > 0 ? t.weightedCorsi / t.iceTime : 0.5;
  return {
    season: t.season,
    totalPlayers: s?.players ?? 0,
    totalGamesPlayed: s?.playerGames ?? 0,
    totalGoals: t.goals,
    totalAssists: s?.assists ?? 0,
    totalShots: t.shots,
    totalExpectedGoals: round(t.xGoals, 1),
    avgCorsiPct: rawCorsi < 1 ? round(rawCorsi * 100, 1) : round(rawCorsi, 1),
    avgGoalsPerGame: t.teamGames > 0 ? round(t.goals / t.teamGames, 2) : 0,
    avgAssistsPerGame: t.teamGames > 0 ? round((s?.assists ?? 0) / t.teamGames, 2) : 0,
    avgToiPerGame: s && s.playerGames > 0 ? round(s.iceTimeSeconds / s.playerGames, 1) : 0,
    avgXgPer60: t.iceTime > 0 ? round((t.xGoals / t.iceTime) * 3600, 2) : 0,
  };
}

export async function getLeagueTrends({ db, query }: ApiContext) {
  const situation = query.string("situation") ?? "all";
  const [teamRows, skaterRows] = await Promise.all([
    db
      .select({
        season: teamSeasons.season,
        teamGames: sqlSum(teamSeasons.gamesPlayed).mapWith(Number),
        goals: sqlSum(teamSeasons.goalsFor).mapWith(Number),
        shots: sqlSum(teamSeasons.shotsOnGoalFor).mapWith(Number),
        xGoals: sqlSum(teamSeasons.xGoalsFor).mapWith(Number),
        weightedCorsi: sql<number>`sum(coalesce(${teamSeasons.corsiPercentage}, 0.50) * ${teamSeasons.iceTime})`.mapWith(Number),
        iceTime: sqlSum(teamSeasons.iceTime).mapWith(Number),
      })
      .from(teamSeasons)
      .where(and(eq(teamSeasons.situation, situation), eq(teamSeasons.isPlayoffs, false)))
      .groupBy(teamSeasons.season)
      .orderBy(asc(teamSeasons.season)),
    db
      .select({
        season: skaterSeasons.season,
        players: sql<number>`count(distinct ${skaterSeasons.playerId})`.mapWith(Number),
        playerGames: sqlSum(skaterSeasons.gamesPlayed).mapWith(Number),
        assists: sqlSum(skaterSeasons.assists).mapWith(Number),
        iceTimeSeconds: sqlSum(skaterSeasons.iceTimeSeconds).mapWith(Number),
      })
      .from(skaterSeasons)
      .where(and(eq(skaterSeasons.situation, situation), eq(skaterSeasons.isPlayoffs, false)))
      .groupBy(skaterSeasons.season),
  ]);
  const skaterBySeason = new Map(skaterRows.map((r) => [r.season, r]));
  return { situation, seasons: teamRows.map((t) => seasonTrend(t, skaterBySeason.get(t.season))) };
}

// ?seasons=2023,2024 (distinct, sorted); defaults to the current season.
function parseSeasons(raw: string | undefined): number[] {
  const list = [
    ...new Set(
      (raw ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => /^[+-]?\d+$/.test(s))
        .map(Number),
    ),
  ].sort((a, b) => a - b);
  return list.length > 0 ? list : [currentSeason()];
}

export async function getGoalieLeagueBaselines({ db, query }: ApiContext) {
  const situation = query.string("situation")?.trim() ? (query.string("situation") as string) : "all";
  const playoffs = query.bool("playoffs") ?? false;
  const seasons = parseSeasons(query.string("seasons"));

  const g = goalieSeasons;
  const [t] = await db
    .select({
      n: count(),
      lowShots: sqlSum(g.lowDangerShots).mapWith(Number),
      medShots: sqlSum(g.mediumDangerShots).mapWith(Number),
      highShots: sqlSum(g.highDangerShots).mapWith(Number),
      lowGoals: sqlSum(g.lowDangerGoals).mapWith(Number),
      medGoals: sqlSum(g.mediumDangerGoals).mapWith(Number),
      highGoals: sqlSum(g.highDangerGoals).mapWith(Number),
      expectedRebounds: sql<number>`coalesce(sum(coalesce(${g.expectedRebounds}, 0)), 0)`.mapWith(Number),
      rebounds: sqlSum(g.rebounds).mapWith(Number),
    })
    .from(g)
    .where(and(inArray(g.season, seasons), eq(g.situation, situation), eq(g.isPlayoffs, playoffs)));

  if (t.n === 0) {
    return {
      seasons, situation, isPlayoffs: playoffs,
      lowDangerSavePct: null, mediumDangerSavePct: null, highDangerSavePct: null, reboundRatio: null,
      lowDangerShots: 0, mediumDangerShots: 0, highDangerShots: 0, expectedRebounds: 0, rebounds: 0,
    };
  }
  const savePct = (shots: number, goals: number) => (shots > 0 ? (shots - goals) / shots : null);
  return {
    seasons,
    situation,
    isPlayoffs: playoffs,
    lowDangerSavePct: savePct(t.lowShots, t.lowGoals),
    mediumDangerSavePct: savePct(t.medShots, t.medGoals),
    highDangerSavePct: savePct(t.highShots, t.highGoals),
    reboundRatio: t.expectedRebounds > 0 ? t.rebounds / t.expectedRebounds : null,
    lowDangerShots: t.lowShots,
    mediumDangerShots: t.medShots,
    highDangerShots: t.highShots,
    expectedRebounds: t.expectedRebounds,
    rebounds: t.rebounds,
  };
}

export async function getSkaterLeagueBaselines({ db, query }: ApiContext) {
  const situation = query.string("situation")?.trim() ? (query.string("situation") as string) : "all";
  const playoffs = query.bool("playoffs") ?? false;
  const seasons = parseSeasons(query.string("seasons"));

  const a = skaterSeasonAdvanced;
  const [t] = await db
    .select({
      n: count(),
      won: sql<number>`coalesce(sum(${a.faceoffsWon}), 0)`.mapWith(Number),
      lost: sql<number>`coalesce(sum(${a.faceoffsLost}), 0)`.mapWith(Number),
    })
    .from(a)
    .where(
      and(
        inArray(a.season, seasons),
        eq(a.situation, situation),
        eq(a.isPlayoffs, playoffs),
        isNotNull(a.faceoffsWon),
        isNotNull(a.faceoffsLost),
      ),
    );

  if (t.n === 0) return { seasons, situation, isPlayoffs: playoffs, faceoffPct: null, totalFaceoffsWon: 0, totalFaceoffsLost: 0 };
  const total = t.won + t.lost;
  return {
    seasons,
    situation,
    isPlayoffs: playoffs,
    faceoffPct: total > 0 ? round((t.won / total) * 100, 2) : null,
    totalFaceoffsWon: t.won,
    totalFaceoffsLost: t.lost,
  };
}
