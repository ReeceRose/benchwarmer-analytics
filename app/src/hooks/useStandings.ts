import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  getPowerRankings,
  getOfficialStandings,
  getStandingsAnalytics,
  getCategoryRankings,
} from "@/lib/api";

export function usePowerRankings(season?: number) {
  return useQuery({
    queryKey: ["power-rankings", season],
    queryFn: () => getPowerRankings(season),
    staleTime: 1000 * 60 * 30, // 30 minutes
    placeholderData: keepPreviousData,
  });
}

export function useOfficialStandings(season?: number) {
  return useQuery({
    queryKey: ["standings", "official", season],
    queryFn: () => getOfficialStandings(season),
    staleTime: season ? 1000 * 60 * 30 : 1000 * 60 * 1, // Historical: 30min, Current: 1min
    placeholderData: keepPreviousData,
  });
}

export function useStandingsAnalytics(season?: number) {
  return useQuery({
    queryKey: ["standings", "analytics", season],
    queryFn: () => getStandingsAnalytics(season),
    staleTime: 1000 * 60 * 30, // 30 minutes - daily data
    placeholderData: keepPreviousData,
  });
}

export function useCategoryRankings(season?: number, team?: string) {
  return useQuery({
    queryKey: ["standings", "category-rankings", season, team],
    queryFn: () => getCategoryRankings(season, team),
    staleTime: 1000 * 60 * 30, // 30 minutes - daily data
    // Only use keepPreviousData for full rankings list, not team-specific queries
    // (showing another team's data as placeholder would be confusing)
    placeholderData: team ? undefined : keepPreviousData,
  });
}
