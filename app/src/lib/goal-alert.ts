import type { GameGoal, GameSummary } from "@/types";

export interface GoalAlert {
  side: "home" | "away";
  teamCode: string;
  /** The goal from the goal list, when the list has caught up with the score. */
  goal: GameGoal | null;
}

/**
 * The goal scored between two polls of the same game, if any. A score that
 * drops (a goal overturned on review) or a different game never alerts.
 */
export function detectGoal(
  prev: GameSummary | undefined,
  next: GameSummary | undefined,
): GoalAlert | null {
  if (!prev || !next || prev.gameId !== next.gameId) return null;
  const sides = (["away", "home"] as const).filter(
    (side) => (next[side].goals ?? 0) > (prev[side].goals ?? 0),
  );
  // Two goals in one poll (rare): alert the latest by goal list order.
  const goals = next.goals ?? [];
  const latestCode = goals.at(-1)?.teamCode;
  const side =
    sides.length > 1
      ? (sides.find((s) => next[s].teamCode === latestCode) ?? sides[0])
      : sides[0];
  if (!side) return null;
  const teamCode = next[side].teamCode;
  const goal = goals.filter((g) => g.teamCode === teamCode).at(-1) ?? null;
  // The goal list can lag the score; don't name the team's previous scorer.
  const fresh =
    goal && !(prev.goals ?? []).some(
      (g) => g.period === goal.period && g.timeInPeriod === goal.timeInPeriod && g.scorerId === goal.scorerId,
    );
  return { side, teamCode, goal: fresh ? goal : null };
}
