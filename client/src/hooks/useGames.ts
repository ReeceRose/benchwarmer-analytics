import { useQuery } from "@tanstack/react-query";
import { getYesterdaysGames, getTodaysGames, getGamesByDate, getGame, getGameBoxscore, getLiveScores } from "@/lib/api";
import type { GamesResponse, GameSummary } from "@/types";

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
    staleTime: 1000 * 60 * 1, // 1 minute - frequent for live games
    refetchInterval: (query) => {
      // Auto-refresh every 30 seconds if there are live games
      const data = query.state.data as GamesResponse | undefined;
      const hasLiveGames = data?.games.some(g => g.gameState === "LIVE" || g.gameState === "CRIT");
      return hasLiveGames ? 30000 : false;
    },
  });
}

export function useLiveScores() {
  return useQuery({
    queryKey: ["games", "live"],
    queryFn: getLiveScores,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: (query) => {
      // Auto-refresh every 30 seconds if there are live games
      const data = query.state.data as GamesResponse | undefined;
      const hasLiveGames = data?.games.some(g => g.gameState === "LIVE" || g.gameState === "CRIT");
      return hasLiveGames ? 30000 : 60000; // 30s if live, 1min otherwise
    },
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

export function useGame(gameId: string | undefined) {
  return useQuery({
    queryKey: ["games", gameId],
    queryFn: () => getGame(gameId!),
    enabled: !!gameId,
    staleTime: 1000 * 30, // 30 seconds - shorter for potential live games
    refetchInterval: (query) => {
      // Auto-refresh every 30 seconds if game is live
      const data = query.state.data as GameSummary | undefined;
      const isLive = data?.gameState === "LIVE" || data?.gameState === "CRIT";
      return isLive ? 30000 : false;
    },
  });
}

export function useGameBoxscore(gameId: string | undefined) {
  return useQuery({
    queryKey: ["games", gameId, "boxscore"],
    queryFn: () => getGameBoxscore(gameId!),
    enabled: !!gameId,
    staleTime: 1000 * 60 * 5,
  });
}
