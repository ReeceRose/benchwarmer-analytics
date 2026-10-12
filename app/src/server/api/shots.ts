import { and, asc, eq, ne, or, sql, type SQL } from "drizzle-orm";
import { queryRows } from "@/server/db/client";
import { shots } from "@/server/db/schema";
import type { ApiContext } from "@/server/api/handler";
import { ApiError, badRequest } from "@/server/api/errors";
import { round, sum } from "@/server/api/format";
import { DangerZones } from "@/server/api/constants";
import { requireTeam } from "@/server/api/teams";

export const VALID_SHOT_TYPES = ["WRIST", "SLAP", "SNAP", "BACKHAND", "TIP", "WRAP", "DEFLECTED"];
export const VALID_SCORE_STATES = ["leading", "trailing", "tied"];

// Columns needed for ShotDto (the shots table has ~140).
export const shotColumns = {
  gameId: shots.gameId,
  eventId: shots.eventId,
  shooterPlayerId: shots.shooterPlayerId,
  shooterName: shots.shooterName,
  shooterPosition: shots.shooterPosition,
  period: shots.period,
  gameTimeSeconds: shots.gameTimeSeconds,
  arenaAdjustedXCoord: shots.arenaAdjustedXCoord,
  arenaAdjustedYCoord: shots.arenaAdjustedYCoord,
  shotDistance: shots.shotDistance,
  shotAngle: shots.shotAngle,
  shotType: shots.shotType,
  isGoal: shots.isGoal,
  shotWasOnGoal: shots.shotWasOnGoal,
  shotOnEmptyNet: shots.shotOnEmptyNet,
  shotRebound: shots.shotRebound,
  shotRush: shots.shotRush,
  xGoal: shots.xGoal,
  homeSkatersOnIce: shots.homeSkatersOnIce,
  awaySkatersOnIce: shots.awaySkatersOnIce,
};

export type ShotRow = { [K in keyof typeof shotColumns]: (typeof shots.$inferSelect)[K] };

// `shotId` is `{gameId}-{eventId}`: MoneyPuck's shotID
// isn't unique (it restarts every season), and the UI uses this as a React key.
export function toShotDto(s: ShotRow) {
  return {
    shotId: `${s.gameId}-${s.eventId}`,
    shooterPlayerId: s.shooterPlayerId,
    shooterName: s.shooterName,
    shooterPosition: s.shooterPosition,
    period: s.period,
    gameTimeSeconds: s.gameTimeSeconds,
    arenaAdjustedXCoord: s.arenaAdjustedXCoord,
    arenaAdjustedYCoord: s.arenaAdjustedYCoord,
    shotDistance: s.shotDistance,
    shotAngle: s.shotAngle,
    shotType: s.shotType,
    isGoal: s.isGoal,
    shotWasOnGoal: s.shotWasOnGoal,
    shotOnEmptyNet: s.shotOnEmptyNet,
    shotRebound: s.shotRebound,
    shotRush: s.shotRush,
    xGoal: s.xGoal,
    homeSkatersOnIce: s.homeSkatersOnIce,
    awaySkatersOnIce: s.awaySkatersOnIce,
    gameId: s.gameId,
  };
}

// Shot totals. Danger zones by shot xG (missing xG = low).
export function shotSummary(rows: readonly Pick<ShotRow, "isGoal" | "shotWasOnGoal" | "xGoal">[]) {
  const totalShots = rows.length;
  const goals = rows.filter((s) => s.isGoal).length;
  const totalXGoal = sum(rows, (s) => s.xGoal);
  let high = 0;
  let medium = 0;
  let low = 0;
  for (const s of rows) {
    const xg = s.xGoal ?? 0;
    if (xg >= DangerZones.highThreshold) high++;
    else if (xg >= DangerZones.mediumThreshold) medium++;
    else low++;
  }
  return {
    totalShots,
    goals,
    shotsOnGoal: rows.filter((s) => s.shotWasOnGoal).length,
    shootingPct: totalShots > 0 ? round((goals / totalShots) * 100, 1) : 0,
    totalXGoal: round(totalXGoal, 2),
    goalsAboveExpected: round(goals - totalXGoal, 2),
    highDangerShots: high,
    mediumDangerShots: medium,
    lowDangerShots: low,
  };
}

// Shared shotType/scoreState validation. shotType is matched upper-case.
function parseShotFilters(ctx: ApiContext) {
  const { query } = ctx;
  const shotType = query.string("shotType")?.toUpperCase();
  if (shotType !== undefined && !VALID_SHOT_TYPES.includes(shotType)) badRequest(ApiError.invalidShotType(VALID_SHOT_TYPES));
  const scoreState = query.string("scoreState")?.toLowerCase();
  if (scoreState !== undefined && !VALID_SCORE_STATES.includes(scoreState)) {
    badRequest({ error: `Invalid score state. Valid values: ${VALID_SCORE_STATES.join(", ")}`, code: "INVALID_SCORE_STATE" });
  }
  return {
    season: query.requiredInt("season"),
    playoffs: query.bool("playoffs"),
    period: query.int("period"),
    shotType,
    scoreState,
    goalsOnly: query.bool("goalsOnly") === true,
    limit: query.int("limit"),
  };
}

// Score state from the shooting team's perspective.
function shooterScoreState(state: string | undefined): SQL | undefined {
  switch (state) {
    case "leading":
      return sql`(case when ${shots.isHomeTeam} then ${shots.homeTeamGoals} > ${shots.awayTeamGoals} else ${shots.awayTeamGoals} > ${shots.homeTeamGoals} end)`;
    case "trailing":
      return sql`(case when ${shots.isHomeTeam} then ${shots.homeTeamGoals} < ${shots.awayTeamGoals} else ${shots.awayTeamGoals} < ${shots.homeTeamGoals} end)`;
    case "tied":
      return eq(shots.homeTeamGoals, shots.awayTeamGoals);
    default:
      return undefined;
  }
}

// Score state from the defending team's perspective.
function defenderScoreState(state: string | undefined, team: string): SQL | undefined {
  switch (state) {
    case "leading":
      return sql`(case when ${shots.homeTeamCode} = ${team} then ${shots.homeTeamGoals} > ${shots.awayTeamGoals} else ${shots.awayTeamGoals} > ${shots.homeTeamGoals} end)`;
    case "trailing":
      return sql`(case when ${shots.homeTeamCode} = ${team} then ${shots.homeTeamGoals} < ${shots.awayTeamGoals} else ${shots.awayTeamGoals} < ${shots.homeTeamGoals} end)`;
    case "tied":
      return eq(shots.homeTeamGoals, shots.awayTeamGoals);
    default:
      return undefined;
  }
}

async function selectShots(ctx: ApiContext, where: SQL | undefined, limit: number | undefined) {
  const query = ctx.db
    .select(shotColumns)
    .from(shots)
    .where(where)
    .orderBy(asc(shots.gameId), asc(shots.period), asc(shots.gameTimeSeconds), asc(shots.eventId))
    .$dynamic();
  if (limit !== undefined) query.limit(Math.max(limit, 0));
  return query;
}

// goalsOnly is applied in SQL before the limit, so `limit` + `goalsOnly`
// returns up to `limit` goals.
export async function getTeamShots(ctx: ApiContext) {
  const abbrev = ctx.params.abbrev;
  const f = parseShotFilters(ctx);
  const playerId = ctx.query.int("playerId");
  await requireTeam(ctx.db, abbrev);

  const rows = await selectShots(
    ctx,
    and(
      eq(shots.teamCode, abbrev),
      eq(shots.season, f.season),
      f.playoffs === undefined ? undefined : eq(shots.isPlayoffGame, f.playoffs),
      f.period === undefined ? undefined : eq(shots.period, f.period),
      f.shotType === undefined ? undefined : eq(shots.shotType, f.shotType),
      playerId === undefined ? undefined : eq(shots.shooterPlayerId, playerId),
      shooterScoreState(f.scoreState),
      f.goalsOnly ? eq(shots.isGoal, true) : undefined,
    ),
    f.limit,
  );
  return {
    teamAbbrev: abbrev,
    season: f.season,
    isPlayoffs: f.playoffs ?? null,
    shots: rows.map(toShotDto),
    summary: shotSummary(rows),
  };
}

export async function getShotsAgainst(ctx: ApiContext) {
  const abbrev = ctx.params.abbrev;
  const f = parseShotFilters(ctx);
  await requireTeam(ctx.db, abbrev);

  const rows = await selectShots(
    ctx,
    and(
      eq(shots.season, f.season),
      ne(shots.teamCode, abbrev),
      or(eq(shots.homeTeamCode, abbrev), eq(shots.awayTeamCode, abbrev)),
      f.playoffs === undefined ? undefined : eq(shots.isPlayoffGame, f.playoffs),
      f.period === undefined ? undefined : eq(shots.period, f.period),
      f.shotType === undefined ? undefined : eq(shots.shotType, f.shotType),
      defenderScoreState(f.scoreState, abbrev),
      f.goalsOnly ? eq(shots.isGoal, true) : undefined,
    ),
    f.limit,
  );
  return {
    teamAbbrev: abbrev,
    season: f.season,
    isPlayoffs: f.playoffs ?? null,
    shots: rows.map(toShotDto),
    summary: shotSummary(rows),
  };
}

// Per-shooter totals for the team's shots, most shots first (ties in order of
// each shooter's first shot).
export async function getShooterStats({ db, params, query }: ApiContext) {
  const abbrev = params.abbrev;
  const season = query.requiredInt("season");
  const playoffs = query.bool("playoffs");
  await requireTeam(db, abbrev);

  const rows = await queryRows<{
    shooter_player_id: number;
    shooter_name: string | null;
    shooter_position: string | null;
    shots: number;
    goals: number;
    x_goals: string;
  }>(db, sql`
    select shooter_player_id, shooter_name, shooter_position,
      count(*)::int as shots, count(*) filter (where is_goal)::int as goals,
      coalesce(sum(x_goal), 0) as x_goals
    from (
      select shooter_player_id, shooter_name, shooter_position, is_goal, x_goal,
        row_number() over (order by game_id, period, game_time_seconds, event_id) as seq
      from shots
      where team_code = ${abbrev} and season = ${season}
        ${playoffs === undefined ? sql`` : sql`and is_playoff_game = ${playoffs}`}
        and shooter_player_id is not null
    ) s
    group by shooter_player_id, shooter_name, shooter_position
    order by count(*) desc, min(seq)
  `);

  return rows.map((r) => {
    const xg = Number(r.x_goals);
    return {
      playerId: r.shooter_player_id,
      playerName: r.shooter_name ?? "Unknown",
      position: r.shooter_position,
      shots: r.shots,
      goals: r.goals,
      shootingPct: r.shots > 0 ? round((r.goals / r.shots) * 100, 1) : 0,
      totalXGoal: round(xg, 2),
      goalsAboveExpected: round(r.goals - xg, 2),
    };
  });
}
