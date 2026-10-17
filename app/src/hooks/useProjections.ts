import { queryOptions, useQuery } from "@tanstack/react-query";
import { getGameProjections, getPlayoffOdds, getSandboxInputs } from "@/lib/api";

export function playoffOddsQueryOptions(season?: number) {
  return queryOptions({
    queryKey: ["projections", "playoff-odds", { season }],
    queryFn: () => getPlayoffOdds(season),
    staleTime: 1000 * 60 * 30,
  });
}

/** The latest playoff odds run. */
export function usePlayoffOdds(season?: number) {
  return useQuery(playoffOddsQueryOptions(season));
}

/** What the playoff odds sandbox simulates from (the latest run's inputs). */
export function useSandboxInputs(season?: number) {
  return useQuery({
    queryKey: ["projections", "sandbox", { season }],
    queryFn: () => getSandboxInputs(season),
    staleTime: 1000 * 60 * 30,
  });
}

/** Pregame win probability for one day's games, keyed by game ID. */
export function useGameProjections(date: string | undefined) {
  return useQuery({
    queryKey: ["projections", "games", { date }],
    queryFn: () => getGameProjections(date!),
    staleTime: 1000 * 60 * 30,
    enabled: date !== undefined,
    select: (data) => new Map(data.games.map((g) => [g.gameId, g.homeWinProbability])),
  });
}
