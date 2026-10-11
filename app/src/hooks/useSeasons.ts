import { useQuery } from "@tanstack/react-query";
import { getSeasons, getTeamSeasons } from "@/lib/api";

export function useSeasons() {
  return useQuery({
    queryKey: ["seasons"],
    queryFn: getSeasons,
    staleTime: 1000 * 60 * 60, // Seasons change rarely
  });
}

export function useTeamSeasons(abbrev: string) {
  return useQuery({
    queryKey: ["teams", abbrev, "seasons"],
    queryFn: () => getTeamSeasons(abbrev),
    staleTime: 1000 * 60 * 60, // Team seasons change rarely
    enabled: !!abbrev,
  });
}
