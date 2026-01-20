import { useQuery } from "@tanstack/react-query";
import { getTeamLines } from "@/lib/api";
import type { LineQueryParams } from "@/types";

export function useLines(abbrev: string, params: LineQueryParams) {
  return useQuery({
    queryKey: ["teams", abbrev, "lines", params],
    queryFn: () => getTeamLines(abbrev, params),
    enabled: !!abbrev && !!params.season,
    staleTime: 1000 * 60 * 5,
  });
}
