import { useQuery } from "@tanstack/react-query";
import { getOutliers } from "@/lib/api";

export function useOutliers(
  season?: number,
  situation?: string,
  skaterLimit: number = 15,
  goalieLimit: number = 5
) {
  return useQuery({
    queryKey: ["outliers", { season, situation, skaterLimit, goalieLimit }],
    queryFn: () => getOutliers(season, situation, skaterLimit, goalieLimit),
    staleTime: 1000 * 60 * 5,
    enabled: season !== undefined,
  });
}
