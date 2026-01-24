import { useQuery } from "@tanstack/react-query";
import { getTopLines } from "@/lib/api";

export function useTopLines(season?: number, situation?: string, limit: number = 5) {
  return useQuery({
    queryKey: ["top-lines", { season, situation, limit }],
    queryFn: () => getTopLines(season, situation, limit),
    staleTime: 1000 * 60 * 5,
    enabled: season !== undefined,
  });
}
