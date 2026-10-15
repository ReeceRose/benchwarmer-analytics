// Active players closing in on round career numbers. The NHL stats API's
// milestone lists pick the candidates, but their totals lag by a week or more,
// so current career totals come from a second (aggregate) request. Ranked by
// how many games away each is at their career rate.

import { HttpError } from "@/server/api/errors";
import { getCareerTotals, getMilestones as fetchMilestones, type NhlCareerTotals, type NhlMilestone } from "@/server/api/nhl-client";
import type { Milestone, MilestonesResponse } from "@/types";

// The NHL's milestone names, and the career total each counts.
const SKATER_TOTALS: Record<string, (m: NhlMilestone) => number | undefined> = {
  Points: (m) => m.points,
  Goals: (m) => m.goals,
  Assists: (m) => m.assists,
  "Games Played": (m) => m.gamesPlayed,
};

const GOALIE_TOTALS: Record<string, (m: NhlMilestone) => number | undefined> = {
  Wins: (m) => m.wins,
  Shutouts: (m) => m.so,
  "Games Played": (m) => m.gamesPlayed,
};

// The smallest target worth a headline; the NHL also lists 100-assist and
// 300-game marks, which would crowd out the big ones.
export const MIN_TARGETS: Record<Milestone["position"], Record<string, number>> = {
  skater: { Points: 500, Goals: 200, Assists: 300, "Games Played": 700 },
  goalie: { Wins: 150, Shutouts: 30, "Games Played": 500 },
};

const MAX_RESULTS = 12;

export function toMilestone(m: NhlMilestone, position: Milestone["position"]): Milestone | null {
  const total = (position === "goalie" ? GOALIE_TOTALS : SKATER_TOTALS)[m.milestone ?? ""];
  const current = total?.(m);
  const target = m.milestoneAmount;
  if (!m.playerId || !m.playerFullName || current == null || !target) return null;
  if (target < (MIN_TARGETS[position][m.milestone ?? ""] ?? Infinity)) return null;
  const remaining = target - current;
  // Already there: the NHL's list lags a game or two behind.
  if (remaining <= 0) return null;

  const games = m.gamesPlayed ?? 0;
  // Games played goes up one a game; everything else at the career rate.
  const perGame = m.milestone === "Games Played" ? 1 : games > 0 ? current / games : 0;
  return {
    playerId: m.playerId,
    name: m.playerFullName,
    team: m.teamAbbrev ?? null,
    position,
    milestone: m.milestone!,
    target,
    current,
    remaining,
    gamesAway: perGame > 0 ? Math.ceil(remaining / perGame) : null,
  };
}

// Closest first by games away; one row per player (their nearest milestone).
export function rankMilestones(rows: Milestone[], limit = MAX_RESULTS): Milestone[] {
  const sorted = [...rows].sort(
    (a, b) => (a.gamesAway ?? Infinity) - (b.gamesAway ?? Infinity) || b.target - a.target || a.name.localeCompare(b.name),
  );
  const seen = new Set<number>();
  const out: Milestone[] = [];
  for (const m of sorted) {
    if (seen.has(m.playerId)) continue;
    seen.add(m.playerId);
    out.push(m);
    if (out.length === limit) break;
  }
  return out;
}

// The milestone row with current totals in place of the list's stale ones.
export function withCurrentTotals(m: NhlMilestone, totals: NhlCareerTotals | undefined): NhlMilestone {
  if (!totals) return m;
  return {
    ...m,
    gamesPlayed: totals.gamesPlayed ?? m.gamesPlayed,
    goals: totals.goals ?? m.goals,
    assists: totals.assists ?? m.assists,
    points: totals.points ?? m.points,
    wins: totals.wins ?? m.wins,
    so: totals.shutouts ?? m.so,
  };
}

async function current(kind: "skater" | "goalie", rows: NhlMilestone[] | null): Promise<Milestone[]> {
  const candidates = (rows ?? []).filter((m) => m.gameTypeId === 2 && m.playerId);
  const totals = await getCareerTotals(kind, [...new Set(candidates.map((m) => m.playerId!))]);
  // Without current totals the list would show milestones already reached.
  if (totals === null) {
    throw new HttpError(502, { error: "NHL career totals are unavailable", code: "UPSTREAM_UNAVAILABLE" });
  }
  return candidates
    .map((m) => toMilestone(withCurrentTotals(m, totals.get(m.playerId!)), kind))
    .filter((m): m is Milestone => m !== null);
}

export async function getMilestones(): Promise<MilestonesResponse> {
  const [skaters, goalies] = await Promise.all([fetchMilestones("skaters"), fetchMilestones("goalies")]);
  // Don't cache an empty list when the NHL is down.
  if (skaters === null && goalies === null) {
    throw new HttpError(502, { error: "NHL milestones are unavailable", code: "UPSTREAM_UNAVAILABLE" });
  }
  const [s, g] = await Promise.all([current("skater", skaters), current("goalie", goalies)]);
  return { milestones: rankMilestones([...s, ...g]) };
}
