import { queryOptions, useQuery } from "@tanstack/react-query";
import { getTodaysGames, getGamesByDate, getGame, getGameBoxscore, getGameShots, getGameLive, getGamePreview, getGoalieRecentForm, getDeserveToWin } from "@/lib/api";
import type { GameBoxscoreResponse, GamesResponse, GameSummary, LiveGameResponse } from "@/types";

// LIVE/CRIT are in play; OVER has ended but isn't official yet, so stats can still be corrected.
function isGameInProgress(state: string | null | undefined): boolean {
  return state === "LIVE" || state === "CRIT" || state === "OVER";
}

export const todaysGamesQueryOptions = queryOptions({
  queryKey: ["games", "today"],
  queryFn: getTodaysGames,
  staleTime: 1000 * 60 * 1, // 1 minute - frequent for live games
  refetchInterval: (query) => {
    const data = query.state.data as GamesResponse | undefined;
    const hasLiveGames = data?.games.some(g => g.gameState === "LIVE" || g.gameState === "CRIT");
    // If live games, refresh every 30s. Otherwise refresh every 2 minutes
    // to catch games that transition from FUT/PRE to LIVE
    const hasPendingGames = data?.games.some(g => g.gameState === "FUT" || g.gameState === "PRE");
    return hasLiveGames ? 30000 : hasPendingGames ? 120000 : false;
  },
});

export function useTodaysGames() {
  return useQuery(todaysGamesQueryOptions);
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
    staleTime: 1000 * 15,
    refetchInterval: (query) => {
      const state = (query.state.data as GameBoxscoreResponse | undefined)?.gameState;
      return isGameInProgress(state) ? 30000 : false;
    },
  });
}

export function useGameShots(gameId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["games", gameId, "shots"],
    queryFn: () => getGameShots(gameId!),
    enabled: !!gameId && enabled,
    staleTime: 1000 * 60 * 60, // 1 hour - shot data is static for completed games
  });
}

export function useGamePreview(gameId: string | undefined) {
  return useQuery({
    queryKey: ["games", gameId, "preview"],
    queryFn: () => getGamePreview(gameId!),
    enabled: !!gameId,
    staleTime: 1000 * 60 * 30, // 30 minutes - preview data is stable
  });
}

export function useGoalieRecentForm(gameId: string | undefined) {
  return useQuery({
    queryKey: ["games", gameId, "goalie-form"],
    queryFn: () => getGoalieRecentForm(gameId!),
    enabled: !!gameId,
    staleTime: 1000 * 60 * 30, // 30 minutes - recent form is relatively stable
  });
}

export function useDeserveToWin(gameId: string | undefined) {
  return useQuery({
    queryKey: ["games", gameId, "deserve-to-win"],
    queryFn: () => getDeserveToWin(gameId!),
    enabled: !!gameId,
    staleTime: 1000 * 60 * 30, // 30 minutes - static for completed games
  });
}

// Game centre feed (play-by-play, shifts, right rail). Polls while the game is live.
export function useGameLive(gameId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["games", gameId, "live"],
    queryFn: () => getGameLive(gameId!),
    enabled: !!gameId && enabled,
    staleTime: 1000 * 15,
    refetchInterval: (query) => {
      const state = (query.state.data as LiveGameResponse | undefined)?.meta.gameState;
      if (state === "OVER") return 60000;
      return isGameInProgress(state) ? 20000 : false;
    },
  });
}
