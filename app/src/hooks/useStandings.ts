import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  getPowerRankings,
  getOfficialStandings,
  getStandingsAnalytics,
  getCategoryRankings,
} from "@/lib/api";
import { getCurrentSeason } from "@/lib/date-utils";

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

// Thresholds reach their full value at the midpoint of the regular season,
// matching the server's scaling in server/api/stats.ts.
const FULL_THRESHOLD_GAMES = 41;

/**
 * Default "minimum games" filter for a season: the full value for past
 * seasons, scaled down by games played so far for the current one. Returns
 * the largest of `options` at or below the scaled value.
 */
export function useSeasonMinGames(
  season: number,
  full: number,
  options: readonly number[],
): number {
  const isCurrent = season === getCurrentSeason();
  const { data } = useOfficialStandings();
  if (!isCurrent || !data) return full;
  const played = Math.max(0, ...data.teams.map((t) => t.gamesPlayed));
  const scaled = full * Math.min(played / FULL_THRESHOLD_GAMES, 1);
  const fits = options.filter((o) => o <= scaled);
  return fits.length > 0 ? Math.max(...fits) : Math.min(...options);
}
