import { GoalsVsXgScatter } from "@/components/charts/GoalsVsXgScatter";
import type { Rookie } from "@/types";

interface GoalsVsExpectedChartProps {
  rookies: Rookie[];
}

/** Rookies' goals against xG. */
export function GoalsVsExpectedChart({ rookies }: GoalsVsExpectedChartProps) {
  return (
    <GoalsVsXgScatter
      points={rookies
        .filter((r) => r.expectedGoals > 0)
        .map((r) => ({
          playerId: r.playerId,
          name: r.name,
          team: r.team,
          goals: r.goals,
          expectedGoals: r.expectedGoals,
          note: r.position ?? undefined,
        }))}
      description="Rookies above the line have scored more than their chances suggest."
      emptyText="No rookies with expected goals yet."
      noun="rookie"
    />
  );
}
