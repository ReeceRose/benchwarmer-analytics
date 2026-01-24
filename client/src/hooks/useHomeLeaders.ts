import { useQueries } from "@tanstack/react-query";
import { getLeaderboard } from "@/lib/api";
import type { LeaderboardCategory, Leaderboards, GoalieLeaderboards, LeaderEntry } from "@/types";

const SKATER_CATEGORIES: LeaderboardCategory[] = ["points", "goals", "expectedGoals", "corsiPct", "iceTime"];
const GOALIE_CATEGORIES: LeaderboardCategory[] = ["savePct", "gaa", "gsax"];

export function useHomeLeaders(season?: number, situation?: string) {
  const skaterQueries = useQueries({
    queries: SKATER_CATEGORIES.map((category) => ({
      queryKey: ["leaderboard", { category, season, situation, limit: 3 }],
      queryFn: () => getLeaderboard(category, season, situation, 3),
      staleTime: 1000 * 60 * 5,
      enabled: season !== undefined,
    })),
  });

  // Goalies always use "all" situation
  const goalieQueries = useQueries({
    queries: GOALIE_CATEGORIES.map((category) => ({
      queryKey: ["leaderboard", { category, season, situation: "all", limit: 3 }],
      queryFn: () => getLeaderboard(category, season, "all", 3),
      staleTime: 1000 * 60 * 5,
      enabled: season !== undefined,
    })),
  });

  const isLoading = skaterQueries.some((q) => q.isLoading) || goalieQueries.some((q) => q.isLoading);
  const error = skaterQueries.find((q) => q.error)?.error || goalieQueries.find((q) => q.error)?.error;

  // Transform results into the Leaderboards shape
  const transformEntry = (entry: { playerId: number; name: string; team?: string; position?: string; primaryValue: number }): LeaderEntry => ({
    playerId: entry.playerId,
    name: entry.name,
    team: entry.team,
    position: entry.position,
    value: entry.primaryValue,
  });

  const leaders: Leaderboards | undefined =
    !isLoading && skaterQueries.every((q) => q.data)
      ? {
          points: skaterQueries[0].data!.entries.map(transformEntry),
          goals: skaterQueries[1].data!.entries.map(transformEntry),
          expectedGoals: skaterQueries[2].data!.entries.map(transformEntry),
          corsiPct: skaterQueries[3].data!.entries.map(transformEntry),
          iceTime: skaterQueries[4].data!.entries.map(transformEntry),
        }
      : undefined;

  const goalieLeaders: GoalieLeaderboards | undefined =
    !isLoading && goalieQueries.every((q) => q.data)
      ? {
          savePct: goalieQueries[0].data!.entries.map(transformEntry),
          goalsAgainstAvg: goalieQueries[1].data!.entries.map(transformEntry),
          goalsSavedAboveExpected: goalieQueries[2].data!.entries.map(transformEntry),
        }
      : undefined;

  const refetch = () => {
    skaterQueries.forEach((q) => q.refetch());
    goalieQueries.forEach((q) => q.refetch());
  };

  return {
    leaders,
    goalieLeaders,
    isLoading,
    error,
    refetch,
  };
}
