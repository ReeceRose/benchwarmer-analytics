import { useQuery, useQueries, keepPreviousData } from "@tanstack/react-query";
import {
  getPlayer,
  getPlayerStats,
  getPlayerLinemates,
  searchPlayers,
  comparePlayers,
  getPlayerRollingStats,
  getGoalieWorkload,
  getGoalieLeagueBaselines,
} from "@/lib/api";

export function usePlayer(id: number) {
  return useQuery({
    queryKey: ["players", id],
    queryFn: () => getPlayer(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function usePlayerStats(
  id: number,
  season?: number,
  situation?: string
) {
  return useQuery({
    queryKey: ["players", id, "stats", { season, situation }],
    queryFn: () => getPlayerStats(id, season, situation),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function usePlayerLinemates(
  id: number,
  season?: number,
  situation?: string
) {
  return useQuery({
    queryKey: ["players", id, "linemates", { season, situation }],
    queryFn: () => getPlayerLinemates(id, season, situation),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function usePlayerSearch(
  query: string,
  page?: number,
  pageSize?: number
) {
  return useQuery({
    queryKey: ["players", "search", { query, page, pageSize }],
    queryFn: () => searchPlayers(query, page, pageSize),
    enabled: query.length >= 2, // Only search when query is at least 2 chars
    staleTime: 1000 * 60 * 2,
    placeholderData: keepPreviousData, // Keep showing previous results while fetching
  });
}

export function usePlayerComparison(
  ids: number[],
  season?: number,
  situation?: string
) {
  return useQuery({
    // Use the raw ids array length and joined string to ensure refetch on change
    queryKey: ["players", "compare", ids.length, ids.join(","), season, situation],
    queryFn: () => comparePlayers(ids, season, situation),
    enabled: ids.length >= 2,
    staleTime: 0, // Always refetch to ensure fresh data
  });
}

export function usePlayers(ids: number[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: ["players", id],
      queryFn: () => getPlayer(id),
      enabled: !!id,
      staleTime: 1000 * 60 * 5,
    })),
    combine: (results) => ({
      data: results.map((r) => r.data).filter(Boolean),
      isLoading: results.some((r) => r.isLoading),
    }),
  });
}

export function usePlayerRollingStats(
  id: number,
  season?: number,
  games?: number
) {
  return useQuery({
    queryKey: ["players", id, "rolling-stats", { season, games }],
    queryFn: () => getPlayerRollingStats(id, season, games),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useGoalieWorkload(
  id: number,
  season?: number,
  games?: number
) {
  return useQuery({
    queryKey: ["players", id, "workload", { season, games }],
    queryFn: () => getGoalieWorkload(id, season, games),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useGoalieLeagueBaselines(
  seasons: number[],
  situation?: string,
  playoffs?: boolean
) {
  return useQuery({
    queryKey: ["stats", "goalie-league-baselines", { seasons, situation, playoffs }],
    queryFn: () => getGoalieLeagueBaselines(seasons, situation, playoffs),
    enabled: seasons.length > 0,
    staleTime: 1000 * 60 * 10,
  });
}
