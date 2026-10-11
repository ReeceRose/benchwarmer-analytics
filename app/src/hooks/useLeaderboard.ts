import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getLeaderboard } from "@/lib/api";
import type { LeaderboardCategory } from "@/types";

export function useLeaderboard(
  category: LeaderboardCategory,
  season?: number,
  situation?: string,
  limit: number = 50,
  sortDir?: "asc" | "desc"
) {
  return useQuery({
    queryKey: ["leaderboard", { category, season, situation, limit, sortDir }],
    queryFn: () => getLeaderboard(category, season, situation, limit, sortDir),
    staleTime: 1000 * 60 * 5, // 5 min cache
    placeholderData: keepPreviousData,
  });
}
