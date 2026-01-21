import { useQuery } from "@tanstack/react-query";
import { getYesterdaysGames, getTodaysGames, getGamesByDate } from "@/lib/api";

export function useYesterdaysGames() {
  return useQuery({
    queryKey: ["games", "yesterday"],
    queryFn: getYesterdaysGames,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useTodaysGames() {
  return useQuery({
    queryKey: ["games", "today"],
    queryFn: getTodaysGames,
    staleTime: 1000 * 60 * 2, // 2 minutes - more frequent for live games
  });
}

export function useGamesByDate(date: string | undefined) {
  return useQuery({
    queryKey: ["games", "date", date],
    queryFn: () => getGamesByDate(date!),
    enabled: !!date,
    staleTime: 1000 * 60 * 5,
  });
}
