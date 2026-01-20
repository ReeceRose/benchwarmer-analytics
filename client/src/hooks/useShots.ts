import { useQuery } from "@tanstack/react-query";
import { getTeamShots, getShooterStats, getPlayerShots } from "@/lib/api";
import type { ShotQueryParams } from "@/types";

export function useTeamShots(abbrev: string, params: ShotQueryParams) {
  return useQuery({
    queryKey: ["teams", abbrev, "shots", params],
    queryFn: () => getTeamShots(abbrev, params),
    enabled: !!abbrev && !!params.season,
    staleTime: 1000 * 60 * 5,
  });
}

export function useShooterStats(
  abbrev: string,
  season?: number,
  playoffs?: boolean
) {
  return useQuery({
    queryKey: ["teams", abbrev, "shots", "shooters", { season, playoffs }],
    queryFn: () => getShooterStats(abbrev, season!, playoffs),
    enabled: !!abbrev && !!season,
    staleTime: 1000 * 60 * 5,
  });
}

export interface PlayerShotParams {
  season?: number;
  limit?: number;
  period?: number;
  shotType?: string;
  goalsOnly?: boolean;
}

export function usePlayerShots(playerId: number, params: PlayerShotParams = {}) {
  return useQuery({
    queryKey: ["players", playerId, "shots", params],
    queryFn: () => getPlayerShots(playerId, params),
    enabled: !!playerId,
    staleTime: 1000 * 60 * 5,
  });
}
