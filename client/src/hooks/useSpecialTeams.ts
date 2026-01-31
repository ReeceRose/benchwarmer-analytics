import { useQuery } from "@tanstack/react-query";
import {
  getTeamSpecialTeams,
  getSpecialTeamsPlayers,
  getSpecialTeamsTrend,
  getSpecialTeamsTeamRankings,
  getSpecialTeamsPlayerLeaders,
  getPlayerPenaltyStats,
} from "@/lib/api";
import type {
  SpecialTeamsSituation,
  PlayerLeaderSortField,
  PenaltySortField,
} from "@/types";

export function useTeamSpecialTeams(
  abbrev: string,
  season?: number,
  playoffs?: boolean
) {
  return useQuery({
    queryKey: ["teams", abbrev, "special-teams", season, playoffs],
    queryFn: () => getTeamSpecialTeams(abbrev, season, playoffs),
    enabled: !!abbrev,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

export function useSpecialTeamsPlayers(
  abbrev: string,
  situation: SpecialTeamsSituation,
  season?: number,
  playoffs?: boolean
) {
  return useQuery({
    queryKey: ["teams", abbrev, "special-teams", "players", situation, season, playoffs],
    queryFn: () => getSpecialTeamsPlayers(abbrev, situation, season, playoffs),
    enabled: !!abbrev,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

export function useSpecialTeamsTrend(
  abbrev: string,
  season?: number,
  playoffs?: boolean
) {
  return useQuery({
    queryKey: ["teams", abbrev, "special-teams", "trend", season, playoffs],
    queryFn: () => getSpecialTeamsTrend(abbrev, season, playoffs),
    enabled: !!abbrev && !!season,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

// League-wide special teams hooks

export function useSpecialTeamsTeamRankings(
  season?: number,
  playoffs?: boolean
) {
  return useQuery({
    queryKey: ["special-teams", "team-rankings", season, playoffs],
    queryFn: () => getSpecialTeamsTeamRankings(season, playoffs),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

export function useSpecialTeamsPlayerLeaders(
  situation: SpecialTeamsSituation,
  season?: number,
  playoffs?: boolean,
  options?: {
    minToi?: number;
    position?: "F" | "D";
    team?: string;
    limit?: number;
    sortBy?: PlayerLeaderSortField;
    sortDir?: "asc" | "desc";
  }
) {
  return useQuery({
    queryKey: [
      "special-teams",
      "player-leaders",
      situation,
      season,
      playoffs,
      options,
    ],
    queryFn: () =>
      getSpecialTeamsPlayerLeaders(situation, season, playoffs, options),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

export function usePlayerPenaltyStats(
  season?: number,
  playoffs?: boolean,
  options?: {
    minToi?: number;
    position?: "F" | "D";
    team?: string;
    limit?: number;
    sortBy?: PenaltySortField;
    sortDir?: "asc" | "desc";
  },
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ["special-teams", "penalty-stats", season, playoffs, options],
    queryFn: () => getPlayerPenaltyStats(season, playoffs, options),
    enabled,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}
