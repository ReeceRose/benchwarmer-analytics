import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Search, Users } from "lucide-react";
import { usePlayerSearch } from "@/hooks";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared";
import { FeaturedPlayers } from "@/components/players";
import { formatPosition } from "@/lib/formatters";

type PlayersSearch = {
  q?: string;
};

export const Route = createFileRoute("/players/")({
  component: PlayersPage,
  validateSearch: (search: Record<string, unknown>): PlayersSearch => ({
    q: typeof search.q === "string" ? search.q : undefined,
  }),
});

function PlayersPage() {
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
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Players</h1>
        <p className="text-muted-foreground">
          Search for NHL players by name to view stats and performance metrics.
        </p>
      </div>
      <div className="mb-8 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search players..."
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            className="pl-9"
          />
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Enter at least 2 characters to search
        </p>
      </div>
      {error && (
        <ErrorState
          title="Search failed"
          message="Could not search players. Please try again."
          onRetry={() => refetch()}
          variant="inline"
        />
      )}
      {showResults && !error && (
        <Card className="py-0 gap-0">
          <CardContent className={`p-0 transition-opacity ${isPlaceholderData ? "opacity-60" : ""}`}>
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !hasResults ? (
              <div className="p-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium">No players found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  No results for &ldquo;{query}&rdquo;. Try a different search term.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Name</TableHead>
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
                          className="hover:underline font-medium"
                        >
                          {player.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {formatPosition(player.position)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {player.currentTeamAbbreviation ? (
                          <Link
                            to="/teams/$abbrev"
                            params={{ abbrev: player.currentTeamAbbreviation }}
                            className="hover:underline text-muted-foreground"
                          >
                            {player.currentTeamAbbreviation}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
      {!error && <FeaturedPlayers enabled={!showResults} />}
    </div>
  );
}
