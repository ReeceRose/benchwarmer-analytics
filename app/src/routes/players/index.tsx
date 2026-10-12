import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { seasonsQueryOptions } from "@/hooks/useSeasons";
import { Search } from "lucide-react";
import { usePlayerSearch, usePageTitle } from "@/hooks";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ErrorState, TableSkeleton, TeamLogo } from "@/components/shared";
import { EmptyState, PageHeader } from "@/components/layout";
import { getPlayerHeadshotUrl } from "@/lib/player-headshots";
import { getTeamName } from "@/lib/team-names";
import { FeaturedPlayers } from "@/components/players";
import { formatPosition } from "@/lib/formatters";

type PlayersSearch = {
  q?: string;
};

export const Route = createFileRoute("/players/")({
  component: PlayersPage,
  loader: ({ context }) =>
    context.queryClient.prefetchQuery(seasonsQueryOptions),
  validateSearch: (search: Record<string, unknown>): PlayersSearch => ({
    q: typeof search.q === "string" ? search.q : undefined,
  }),
});

function PlayersPage() {
  usePageTitle("Players");

  const { q: query = "" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data, isLoading, isPlaceholderData, error, refetch } = usePlayerSearch(query, 1, 50);

  const setQuery = (value: string) => {
    navigate({
      search: value ? { q: value } : {},
      replace: true,
    });
  };

  const showResults = query.length >= 2;
  const hasResults = data?.players && data.players.length > 0;

  return (
    <div className="container space-y-8 py-8">
      <PageHeader
        title="Players"
        description="Find any skater or goalie from 2008 onwards."
      />
      <div className="max-w-xl">
        <div className="relative">
          <Search className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, e.g. Makar"
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            className="h-12 rounded-full pl-12 text-base"
            autoFocus
          />
        </div>
      </div>
      {error && (
        <ErrorState
          title="Search failed"
          message="The player search request failed."
          onRetry={() => refetch()}
          variant="inline"
        />
      )}
      {showResults && !error && (
        isLoading ? (
          <TableSkeleton rows={6} columns={3} />
        ) : !hasResults ? (
          <EmptyState
            title={`No players match "${query}"`}
            hint="Check the spelling, or try just a last name."
          />
        ) : (
          <div
            className={`overflow-hidden rounded-2xl border bg-card transition-opacity ${isPlaceholderData ? "opacity-60" : ""}`}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/2">Player</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Team</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.players.map((player) => (
                  <TableRow key={player.id}>
                    <TableCell>
                      <Link
                        to="/players/$id"
                        params={{ id: String(player.id) }}
                        className="flex items-center gap-3 font-medium hover:text-link"
                      >
                        <img
                          src={getPlayerHeadshotUrl(
                            player.id,
                            player.currentTeamAbbreviation,
                          )}
                          alt=""
                          className="size-8 rounded-full bg-accent object-cover"
                        />
                        {player.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatPosition(player.position)}
                    </TableCell>
                    <TableCell>
                      {player.currentTeamAbbreviation ? (
                        <Link
                          to="/teams/$abbrev"
                          params={{ abbrev: player.currentTeamAbbreviation }}
                          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                        >
                          <TeamLogo abbrev={player.currentTeamAbbreviation} size="sm" />
                          {getTeamName(player.currentTeamAbbreviation)}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">–</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      )}
      {!error && <FeaturedPlayers enabled={!showResults} />}
    </div>
  );
}
