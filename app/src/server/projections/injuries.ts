import { toPlayerInjury, type InjuryFields } from "@/server/api/injuries";
import type { Queryable } from "@/server/ingestion/db";
import { XGA_PER_GAME } from "@/lib/projections/goalie-outlook";
import { byGame, starterOf, type GoalieGame, type GoalieTable } from "@/server/projections/goalies";
import type { GoalieOutlook, PlayerInjury } from "@/types";

// Goalie availability for the sandbox's injury option. The main model
// weights a team's goalies by this season's starts and doesn't know who's
// hurt. With the option on, each remaining game uses the goalie expected to
// start it, leaving out goalies on the injury list (ESPN) until their
// earliest return, and adds STARTER_GAP_COEFFICIENT × outlookGap (lib/
// projections/goalie-outlook.ts) to that game's logit. Only teams with a
// goalie listed as out change.
/** Weight of last season's starts with the team, so a goalie back from injury with no starts yet still counts. */
export const LAST_SEASON_WEIGHT = 0.25;
/** How long a goalie listed as out with no expected return is assumed to miss. */
export const UNKNOWN_RETURN_DAYS = 14;

export interface InjuredGoalie {
  /** NHL id, matched to shot data by name when ESPN's entry has none. */
  playerId: number | null;
  name: string;
  team: string;
  injury: PlayerInjury;
}

/** Goalies on the injury list now. */
export async function injuredGoalies(db: Queryable, season: number): Promise<InjuredGoalie[]> {
  const { rows } = await db.query<InjuryFields & { playerId: number | null; name: string; team: string }>(
    `SELECT coalesce(i.player_id, (SELECT max(s.goalie_player_id) FROM shots s WHERE s.goalie_name = i.player_name AND s.season IN ($1, $1 - 1))) AS "playerId",
            i.player_name AS name, i.team, i.status, i.injury_type AS "injuryType", i.detail, i.side, i.comment,
            i.expected_return::text AS "expectedReturn", i.reported_at AS "reportedAt", i.first_seen_at AS "firstSeenAt"
     FROM player_injuries i
     WHERE i.resolved_at IS NULL AND i.position = 'G'
     ORDER BY i.team, i.player_name`,
    [season],
  );
  return rows.map((r) => ({ playerId: r.playerId, name: r.name, team: r.team, injury: toPlayerInjury(r) }));
}

/** Each team's starts by goalie in one season's rows. */
export function seasonStarts(rows: readonly GoalieGame[], season: number): Map<string, Map<number, number>> {
  const out = new Map<string, Map<number, number>>();
  for (const game of byGame(rows.filter((r) => r.season === season)).values()) {
    for (const team of new Set(game.map((r) => r.team))) {
      const goalie = starterOf(game, team)!;
      const s = out.get(team) ?? new Map<number, number>();
      s.set(goalie, (s.get(goalie) ?? 0) + 1);
      out.set(team, s);
    }
  }
  return out;
}

const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/**
 * Outlooks for teams with a goalie listed as out (day-to-day goalies are
 * assumed to play), for `outlookGap`. Candidates are the team's starters
 * this season plus its injured goalies, weighted by starts this season and
 * LAST_SEASON_WEIGHT of last season's starts with the team. Injured goalies
 * are out until ESPN's earliest return (assumed to be when they come back).
 */
export function goalieOutlooks(
  goalies: GoalieTable,
  lastSeason: Map<string, Map<number, number>>,
  injured: readonly InjuredGoalie[],
  today: string,
): Map<string, GoalieOutlook> {
  const out = new Map<string, GoalieOutlook>();
  const byTeam = new Map<string, InjuredGoalie[]>();
  for (const g of injured) byTeam.set(g.team, [...(byTeam.get(g.team) ?? []), g]);
  for (const [team, list] of byTeam) {
    const outUntil = new Map(
      list
        .filter((g) => g.injury.status !== "day_to_day" && g.playerId !== null)
        .map((g) => [g.playerId!, g.injury.earliestReturn ?? addDays(today, UNKNOWN_RETURN_DAYS)]),
    );
    if (!outUntil.size) continue;
    const weights = new Map<number, number>();
    for (const [goalie, n] of goalies.startsFor(team)) weights.set(goalie, n);
    for (const g of list) {
      if (g.playerId === null) continue;
      weights.set(g.playerId, (weights.get(g.playerId) ?? 0) + LAST_SEASON_WEIGHT * (lastSeason.get(team)?.get(g.playerId) ?? 0));
    }
    out.set(team, {
      usual: goalies.team(team) / XGA_PER_GAME,
      goalies: [...weights].map(([playerId, weight]) => ({ playerId, talent: goalies.talent(playerId), weight, outUntil: outUntil.get(playerId) ?? null })),
    });
  }
  return out;
}
