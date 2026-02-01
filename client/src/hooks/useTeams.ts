import { useQuery } from "@tanstack/react-query";
import { getTeams, getTeam, getTeamRoster, getScoreStateStats } from "@/lib/api";

export function useTeams() {
  return useQuery({
    queryKey: ["teams"],
    queryFn: getTeams,
    staleTime: 1000 * 60 * 60, // Teams rarely change, cache for 1 hour
  });
}

export function useTeam(abbrev: string) {
  return useQuery({
    queryKey: ["teams", abbrev],
    queryFn: () => getTeam(abbrev),
    enabled: !!abbrev,
    staleTime: 1000 * 60 * 60,
  });
}

export function useTeamRoster(abbrev: string, season?: number, playoffs?: boolean) {
  return useQuery({
    queryKey: ["teams", abbrev, "roster", season, playoffs],
    queryFn: () => getTeamRoster(abbrev, season, playoffs),
    enabled: !!abbrev,
    staleTime: 1000 * 60 * 5, // Rosters may change more often
  });
}

export function useScoreStateStats(abbrev: string, season?: number, playoffs?: boolean) {
  return useQuery({
    queryKey: ["teams", abbrev, "score-state-stats", season, playoffs],
    queryFn: () => getScoreStateStats(abbrev, season, playoffs),
    enabled: !!abbrev,
    staleTime: 1000 * 60 * 5,
  });
}
