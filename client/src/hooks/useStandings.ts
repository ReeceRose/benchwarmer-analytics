import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getPowerRankings } from "@/lib/api";

export function usePowerRankings(season?: number) {
  return useQuery({
    queryKey: ["power-rankings", season],
    queryFn: () => getPowerRankings(season),
    staleTime: 1000 * 60 * 30, // 30 minutes
    placeholderData: keepPreviousData, // Show old data while loading new season
  });
}
