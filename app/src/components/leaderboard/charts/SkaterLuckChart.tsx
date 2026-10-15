import { GoalsVsXgScatter } from "@/components/charts/GoalsVsXgScatter";
import type { LeaderboardEntry } from "@/types";

interface SkaterLuckChartProps {
  entries: LeaderboardEntry[];
}

/** The leaderboard's skaters, goals against xG. */
export function SkaterLuckChart({ entries }: SkaterLuckChartProps) {
  return (
    <GoalsVsXgScatter
      points={entries
        .filter((e) => e.goals != null && e.expectedGoals != null && e.expectedGoals > 0)
        .map((e) => ({
          playerId: e.playerId,
          name: e.name,
          team: e.team ?? "",
          goals: e.goals!,
          expectedGoals: e.expectedGoals!,
          note: e.position,
        }))}
      description="Players above the line have scored more than their chances suggest."
      emptyText="No qualified players for this selection."
    />
  );
}
