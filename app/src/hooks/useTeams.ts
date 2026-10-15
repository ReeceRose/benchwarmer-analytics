import { queryOptions, useQuery } from "@tanstack/react-query";
import { getTeams, getTeam, getTeamRoster, getScoreStateStats, getTeamGameLog, getTeamInjuries, getTeamTransactions } from "@/lib/api";

export const teamsQueryOptions = queryOptions({
  queryKey: ["teams"],
  queryFn: getTeams,
  staleTime: 1000 * 60 * 60, // Teams rarely change, cache for 1 hour
});

export function useTeams() {
  return useQuery(teamsQueryOptions);
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

export function useTeamGameLog(abbrev: string, season?: number, playoffs?: boolean) {
  return useQuery({
    queryKey: ["teams", abbrev, "games", season, playoffs],
    queryFn: () => getTeamGameLog(abbrev, season, playoffs),
    enabled: !!abbrev,
  });
}

/** A team's current injuries (ESPN, refreshed twice a day). */
export function useTeamInjuries(abbrev: string, enabled = true) {
  return useQuery({
    queryKey: ["teams", abbrev, "injuries"],
    queryFn: () => getTeamInjuries(abbrev),
    enabled: !!abbrev && enabled,
    staleTime: 1000 * 60 * 5,
  });
}

/** A team's most recent transactions, newest first. */
export function useTeamTransactions(abbrev: string, limit?: number) {
  return useQuery({
    queryKey: ["teams", abbrev, "transactions", limit],
    queryFn: () => getTeamTransactions(abbrev, limit),
    enabled: !!abbrev,
    staleTime: 1000 * 60 * 5,
  });
}
