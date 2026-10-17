import type { GoalieOutlook } from "@/types";

// Goalie availability for the sandbox's injury option (built by
// server/projections/injuries.ts). Shared so the browser and server agree.

/** Unblocked expected goals an average team faces per game (all situations, 2015-2025). */
export const XGA_PER_GAME = 3.2;

/** Goals saved above expected per expected goal of a goalie's first 20 NHL starts (2010-2025): what an unknown call-up is worth. */
export const REPLACEMENT_TALENT = -0.021;

/**
 * Goals per game by which the expected starter on `date` beats the team's
 * usual goaltending: the healthy goalies' talent weighted by starts, or a
 * replacement-level call-up when none of them is healthy.
 */
export function outlookGap(outlook: GoalieOutlook, date: string): number {
  let total = 0;
  let value = 0;
  for (const g of outlook.goalies) {
    if (g.outUntil && date < g.outUntil) continue;
    total += g.weight;
    value += g.weight * g.talent;
  }
  return ((total > 0 ? value / total : REPLACEMENT_TALENT) - outlook.usual) * XGA_PER_GAME;
}
