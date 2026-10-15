import { GoalsVsXgScatter } from "@/components/charts/GoalsVsXgScatter";
import type { RosterPlayer } from "@/types/player";

interface RosterXGScatterProps {
  players: RosterPlayer[];
  teamAbbrev: string;
}

/** The roster's skaters, goals against xG. */
export function RosterXGScatter({ players, teamAbbrev }: RosterXGScatterProps) {
  return (
    <GoalsVsXgScatter
      points={players
        .filter((p) => p.position !== "G" && p.expectedGoals != null && p.expectedGoals > 0 && p.goals != null)
        .map((p) => ({
          playerId: p.id,
          name: p.name,
          team: p.currentTeamAbbreviation ?? teamAbbrev,
          goals: p.goals ?? 0,
          expectedGoals: p.expectedGoals ?? 0,
          note: p.position ?? undefined,
        }))}
      description="Players above the line have scored more than their chances suggest; below, fewer."
      emptyText="No expected goals for this roster yet."
    />
  );
}
