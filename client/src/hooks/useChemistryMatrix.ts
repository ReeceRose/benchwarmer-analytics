import { useQuery } from "@tanstack/react-query";
import { getChemistryMatrix } from "@/lib/api";
import type { ChemistryMatrixQueryParams } from "@/types";

export function useChemistryMatrix(
  abbrev: string,
  params: ChemistryMatrixQueryParams
) {
  return useQuery({
    queryKey: ["teams", abbrev, "chemistry-matrix", params],
    queryFn: () => getChemistryMatrix(abbrev, params),
    enabled: !!abbrev && !!params.season,
    staleTime: 1000 * 60 * 5,
  });
}
