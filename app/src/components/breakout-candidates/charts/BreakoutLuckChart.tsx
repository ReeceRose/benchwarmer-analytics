import { GoalsVsXgScatter } from "@/components/charts/GoalsVsXgScatter";
import type { BreakoutCandidate } from "@/types";

interface BreakoutLuckChartProps {
  candidates: BreakoutCandidate[];
}

/** Candidates' goals against xG; the ones below the line are the breakout case. */
export function BreakoutLuckChart({ candidates }: BreakoutLuckChartProps) {
  return (
    <GoalsVsXgScatter
      points={candidates
        .filter((c) => c.expectedGoals > 0)
        .map((c) => ({
          playerId: c.playerId,
          name: c.name,
          team: c.team,
          goals: c.goals,
          expectedGoals: c.expectedGoals,
          note: c.position ?? undefined,
        }))}
      description="Players below the line have scored fewer goals than their chances suggest. They're the ones due for more."
      emptyText="No candidates for this selection. Try fewer games."
      highlight="below"
    />
  );
}
