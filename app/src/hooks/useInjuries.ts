import { queryOptions, useQuery } from "@tanstack/react-query";
import { getLeagueInjuries, getLeagueTransactions } from "@/lib/api";

export const leagueInjuriesQueryOptions = (limit?: number) =>
  queryOptions({
    queryKey: ["injuries", limit],
    queryFn: () => getLeagueInjuries(limit),
    staleTime: 1000 * 60 * 5,
  });

export const leagueTransactionsQueryOptions = (limit?: number) =>
  queryOptions({
    queryKey: ["transactions", limit],
    queryFn: () => getLeagueTransactions(limit),
    staleTime: 1000 * 60 * 5,
  });

/** The newest additions to the injury list league-wide (ESPN, refreshed twice a day). */
export function useLeagueInjuries(limit?: number) {
  return useQuery(leagueInjuriesQueryOptions(limit));
}

/** The league's most recent transactions, newest first. */
export function useLeagueTransactions(limit?: number) {
  return useQuery(leagueTransactionsQueryOptions(limit));
}
