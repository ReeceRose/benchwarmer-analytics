import { queryOptions, useQuery } from "@tanstack/react-query";
import { getSeasons, getTeamSeasons } from "@/lib/api";

// Shared with route loaders, which prefetch seasons so pages know their
// default season on first render (season-dependent queries start right away
// and show their skeletons instead of rendering nothing while disabled).
export const seasonsQueryOptions = queryOptions({
  queryKey: ["seasons"],
  queryFn: getSeasons,
  staleTime: 1000 * 60 * 60, // Seasons change rarely
});

export function teamSeasonsQueryOptions(abbrev: string) {
  return queryOptions({
    queryKey: ["teams", abbrev, "seasons"],
    queryFn: () => getTeamSeasons(abbrev),
    staleTime: 1000 * 60 * 60, // Team seasons change rarely
    enabled: !!abbrev,
  });
}

export function useSeasons() {
  return useQuery(seasonsQueryOptions);
}

export function useTeamSeasons(abbrev: string) {
  return useQuery(teamSeasonsQueryOptions(abbrev));
}
