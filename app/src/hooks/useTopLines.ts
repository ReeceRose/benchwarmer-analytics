import { queryOptions, useQuery } from "@tanstack/react-query";
import { getTopLines } from "@/lib/api";

export function topLinesQueryOptions(season?: number, situation?: string, limit: number = 5) {
  return queryOptions({
    queryKey: ["top-lines", { season, situation, limit }],
    queryFn: () => getTopLines(season, situation, limit),
    staleTime: 1000 * 60 * 5,
    enabled: season !== undefined,
  });
}

export function useTopLines(season?: number, situation?: string, limit: number = 5) {
  return useQuery(topLinesQueryOptions(season, situation, limit));
}
