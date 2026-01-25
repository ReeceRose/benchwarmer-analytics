import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getRookies } from "@/lib/api";

export function useRookies(
  season?: number,
  minGames?: number,
  limit?: number,
  position?: string
) {
  return useQuery({
    queryKey: ["analytics", "rookies", { season, minGames, limit, position }],
    queryFn: () => getRookies(season, minGames, limit, position),
    staleTime: 1000 * 60 * 5, // 5 min cache
    placeholderData: keepPreviousData,
  });
}
