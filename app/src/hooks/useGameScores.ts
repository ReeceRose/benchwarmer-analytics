import { queryOptions, useQuery } from "@tanstack/react-query";
import { getNightlyGameScores, getSingleGameRecords } from "@/lib/api";

export function nightlyGameScoresQueryOptions(date?: string) {
  return queryOptions({
    queryKey: ["game-scores", "nightly", { date }],
    queryFn: () => getNightlyGameScores(date),
    staleTime: 1000 * 60 * 30,
  });
}

/** Last night's (or `date`'s) best and worst Game Scores. */
export function useNightlyGameScores(date?: string) {
  return useQuery(nightlyGameScoresQueryOptions(date));
}

/** The season's best and worst single-game Game Scores. */
export function useSingleGameRecords(season?: number, position?: "F" | "D", playoffs?: boolean) {
  return useQuery({
    queryKey: ["game-scores", "single-games", { season, position, playoffs }],
    queryFn: () => getSingleGameRecords(season, position, playoffs),
    staleTime: 1000 * 60 * 30,
    enabled: season !== undefined,
  });
}
