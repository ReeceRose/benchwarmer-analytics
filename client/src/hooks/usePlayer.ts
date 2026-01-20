import { useQuery } from "@tanstack/react-query";
import {
  getPlayer,
  getPlayerStats,
  getPlayerLinemates,
  searchPlayers,
  comparePlayers,
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
  });
}

export function usePlayerComparison(
  ids: number[],
  season?: number,
  situation?: string
) {
  return useQuery({
    queryKey: ["players", "compare", { ids, season, situation }],
    queryFn: () => comparePlayers(ids, season, situation),
    enabled: ids.length >= 2,
    staleTime: 1000 * 60 * 5,
  });
}
