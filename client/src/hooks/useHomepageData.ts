import { useQuery } from "@tanstack/react-query";
import { getHomepageData } from "@/lib/api";

export function useHomepageData(season?: number, situation?: string) {
  return useQuery({
    queryKey: ["homepage", { season, situation }],
    queryFn: () => getHomepageData(season!, situation),
    staleTime: 1000 * 60 * 5,
    enabled: season !== undefined,
  });
}
