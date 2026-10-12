import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getBreakoutCandidates, getAgeCurves, getAgeDistribution, getSeasonPercentiles, getLeagueTrends } from "@/lib/api";

export function useBreakoutCandidates(
  season?: number,
  minGames?: number,
  limit?: number
) {
  return useQuery({
    queryKey: ["analytics", "breakout-candidates", { season, minGames, limit }],
    queryFn: () => getBreakoutCandidates(season, minGames, limit),
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData, // Show old data while loading new filters
  });
}

export function useAgeCurves(minGames?: number, playerIds?: number[], useMedian?: boolean) {
  // Sort and join playerIds for stable query key comparison
  const playerIdsKey = playerIds?.slice().sort((a, b) => a - b).join(",") ?? "";

  return useQuery({
    queryKey: ["analytics", "age-curves", minGames, playerIdsKey, useMedian],
    queryFn: () => getAgeCurves(minGames, playerIds, useMedian),
    staleTime: 1000 * 60 * 5, // 5 min cache
    placeholderData: keepPreviousData, // Show old data while loading new settings
  });
}

export function useAgeDistribution(age: number | null, minGames?: number) {
  return useQuery({
    queryKey: ["analytics", "age-distribution", age, minGames],
    queryFn: () => getAgeDistribution(age!, minGames),
    enabled: age !== null,
    staleTime: 1000 * 60 * 10, // 10 min cache (distribution data is static)
  });
}

export function useSeasonPercentiles(season: number | undefined, minGames?: number) {
  return useQuery({
    queryKey: ["analytics", "season-percentiles", season, minGames],
    queryFn: () => getSeasonPercentiles(season!, minGames),
    enabled: season !== undefined,
    staleTime: 1000 * 60 * 30, // 30 min cache (percentiles don't change often)
  });
}

export function useLeagueTrends(situation?: string) {
  return useQuery({
    queryKey: ["analytics", "league-trends", situation],
    queryFn: () => getLeagueTrends(situation),
    staleTime: 1000 * 60 * 10, // 10 min cache
    placeholderData: keepPreviousData,
  });
}
