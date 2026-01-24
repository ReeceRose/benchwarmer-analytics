import { useQuery } from "@tanstack/react-query";
import { getTeamSpecialTeams, getSpecialTeamsPlayers } from "@/lib/api";
import type { SpecialTeamsSituation } from "@/types";

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
