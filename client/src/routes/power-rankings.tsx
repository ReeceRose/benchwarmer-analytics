import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Trophy, Info, Filter } from "lucide-react";
import { usePowerRankings, useSeasons } from "@/hooks";
import { getCurrentSeason } from "@/lib/date-utils";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, SortableTableHeader } from "@/components/shared";
import { TeamRow, RegressionCard } from "@/components/power-rankings";
import { z } from "zod";

const sortKeySchema = z.enum([
  "gamesPlayed",
  "wins",
  "losses",
  "otLosses",
  "points",
  "goalsFor",
  "goalsAgainst",
  "ppPct",
  "pkPct",
  "xGoalsPct",
  "corsiPct",
  "pdo",
  "pointsDiff",
]);

type SortKey = z.infer<typeof sortKeySchema>;

const searchSchema = z.object({
  season: z.number().optional(),
  sortKey: sortKeySchema.optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});

export const Route = createFileRoute("/power-rankings")({
  component: PowerRankingsPage,
  validateSearch: searchSchema,
});

function PowerRankingsPage() {
  // Use calculated default season immediately - don't wait for API
  const defaultSeason = getCurrentSeason();
  const { data: seasonsData } = useSeasons();
  const apiCurrentSeason = seasonsData?.seasons?.[0]?.year;

  const navigate = useNavigate({ from: Route.fullPath });
  const { season, sortKey: urlSortKey, sortDir: urlSortDir } = Route.useSearch();

  // Prefer URL param > API current season > calculated default
  const effectiveSeason = season ?? apiCurrentSeason ?? defaultSeason;
  const isCurrentSeason = effectiveSeason === (apiCurrentSeason ?? defaultSeason);
  const { data, isLoading, error, refetch } = usePowerRankings(effectiveSeason);

  // Sort state from URL with defaults
  const sortKey: SortKey = urlSortKey ?? "points";
  const sortDesc = urlSortDir ? urlSortDir === "desc" : true;

  // Sort teams client-side based on URL params
  const sortedTeams = (() => {
    if (!data?.teams) return [];
    const teams = [...data.teams];
    teams.sort((a, b) => {
      const aVal = Number(a[sortKey] ?? 0);
      const bVal = Number(b[sortKey] ?? 0);
      return sortDesc ? bVal - aVal : aVal - bVal;
    });
    return teams;
  })();

  const updateSearch = (updates: Partial<{ season: number; sortKey: SortKey; sortDir: "asc" | "desc" }>) => {
    navigate({ search: (prev) => ({ ...prev, ...updates }) });
  };

  const handleSort = (key: string) => {
    if (key === sortKey) {
      // Toggle direction
      updateSearch({ sortDir: sortDesc ? "asc" : "desc" });
    } else {
      // New column - default to descending
      updateSearch({ sortKey: key as SortKey, sortDir: "desc" });
    }
  };

  return (
    <div className="container py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Power Rankings</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl">
          League-wide team rankings combining traditional standings with
          advanced analytics. Identify teams that are over or underperforming
          their underlying metrics.
        </p>
      </div>

      <Card className="mb-6 py-3 px-4">
        <div className="flex items-start gap-3">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Key Metrics: </span>
            <strong>PP%</strong> (power play success rate),{" "}
            <strong>PK%</strong> (penalty kill success rate),{" "}
            <strong>xG%</strong> (expected goals share),{" "}
            <strong>CF%</strong> (shot attempt share),{" "}
            <strong>PDO</strong> (shooting% + save% - values near 100 are
            sustainable).
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={String(effectiveSeason ?? "")}
            onValueChange={(v) => updateSearch({ season: parseInt(v) })}
          >
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder="Season" />
            </SelectTrigger>
            <SelectContent>
              {seasonsData?.seasons?.map((s) => (
                <SelectItem key={s.year} value={String(s.year)}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isCurrentSeason &&
        data?.insights &&
        (data.insights.likelyToImprove.length > 0 ||
          data.insights.likelyToRegress.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <RegressionCard
              title="Likely to Improve"
              icon="up"
              candidates={data.insights.likelyToImprove}
              season={effectiveSeason}
            />
            <RegressionCard
              title="Likely to Regress"
              icon="down"
              candidates={data.insights.likelyToRegress}
              season={effectiveSeason}
            />
          </div>
        )}

      {error && (
        <ErrorState
          title="Failed to load rankings"
          message="Could not fetch power rankings. Please try again."
          onRetry={() => refetch()}
        />
      )}

      {isLoading ? (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : data?.teams && data.teams.length > 0 ? (
        <>
          <Card className="py-0 gap-0">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="table-fixed min-w-225">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead className="w-32">Team</TableHead>
                      <SortableTableHeader
                        label="GP"
                        tooltip="Games played"
                        sortKey="gamesPlayed"
                        currentSort={sortKey}
                        sortDesc={sortDesc}
                        onSort={handleSort}
                        isHighlighted={sortKey === "gamesPlayed"}
                        className="w-12"
                      />
                      <SortableTableHeader
                        label="W"
                        tooltip="Wins"
                        sortKey="wins"
                        currentSort={sortKey}
                        sortDesc={sortDesc}
                        onSort={handleSort}
                        isHighlighted={sortKey === "wins"}
                        className="w-12"
                      />
                      <SortableTableHeader
                        label="L"
                        tooltip="Losses"
                        sortKey="losses"
                        currentSort={sortKey}
                        sortDesc={sortDesc}
                        onSort={handleSort}
                        isHighlighted={sortKey === "losses"}
                        className="w-12"
                      />
                      <SortableTableHeader
                        label="OTL"
                        tooltip="Overtime losses"
                        sortKey="otLosses"
                        currentSort={sortKey}
                        sortDesc={sortDesc}
                        onSort={handleSort}
                        isHighlighted={sortKey === "otLosses"}
                        className="w-12"
                      />
                      <SortableTableHeader
                        label="Pts"
                        tooltip="Points (W×2 + OTL)"
                        sortKey="points"
                        currentSort={sortKey}
                        sortDesc={sortDesc}
                        onSort={handleSort}
                        isHighlighted={sortKey === "points"}
                        className="w-12"
                      />
                      <SortableTableHeader
                        label="GF"
                        tooltip="Goals for"
                        sortKey="goalsFor"
                        currentSort={sortKey}
                        sortDesc={sortDesc}
                        onSort={handleSort}
                        isHighlighted={sortKey === "goalsFor"}
                        className="w-12"
                      />
                      <SortableTableHeader
                        label="GA"
                        tooltip="Goals against"
                        sortKey="goalsAgainst"
                        currentSort={sortKey}
                        sortDesc={sortDesc}
                        onSort={handleSort}
                        isHighlighted={sortKey === "goalsAgainst"}
                        className="w-12"
                      />
                      <SortableTableHeader
                        label="PP%"
                        tooltip="Power play percentage"
                        sortKey="ppPct"
                        currentSort={sortKey}
                        sortDesc={sortDesc}
                        onSort={handleSort}
                        isHighlighted={sortKey === "ppPct"}
                        className="w-14"
                      />
                      <SortableTableHeader
                        label="PK%"
                        tooltip="Penalty kill percentage"
                        sortKey="pkPct"
                        currentSort={sortKey}
                        sortDesc={sortDesc}
                        onSort={handleSort}
                        isHighlighted={sortKey === "pkPct"}
                        className="w-14"
                      />
                      <SortableTableHeader
                        label="xG%"
                        tooltip="Expected goals percentage (share of expected goals)"
                        sortKey="xGoalsPct"
                        currentSort={sortKey}
                        sortDesc={sortDesc}
                        onSort={handleSort}
                        isHighlighted={sortKey === "xGoalsPct"}
                        className="w-14"
                      />
                      <SortableTableHeader
                        label="CF%"
                        tooltip="Corsi percentage (shot attempt share)"
                        sortKey="corsiPct"
                        currentSort={sortKey}
                        sortDesc={sortDesc}
                        onSort={handleSort}
                        isHighlighted={sortKey === "corsiPct"}
                        className="w-14"
                      />
                      <SortableTableHeader
                        label="PDO"
                        tooltip="Shooting% + Save% (values near 100 are sustainable)"
                        sortKey="pdo"
                        currentSort={sortKey}
                        sortDesc={sortDesc}
                        onSort={handleSort}
                        isHighlighted={sortKey === "pdo"}
                        className="w-14"
                      />
                      <SortableTableHeader
                        label="Pts±"
                        tooltip="Points above/below expected (positive = overperforming)"
                        sortKey="pointsDiff"
                        currentSort={sortKey}
                        sortDesc={sortDesc}
                        onSort={handleSort}
                        isHighlighted={sortKey === "pointsDiff"}
                        className="w-14"
                      />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedTeams.map((team, index) => (
                      <TeamRow
                        key={team.abbreviation}
                        team={team}
                        rank={index + 1}
                        season={effectiveSeason}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          <div className="flex items-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-success" />
              <span className="text-muted-foreground">
                Strong / Underperforming (room to improve)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-muted-foreground" />
              <span className="text-muted-foreground">
                Average / Sustainable
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-error" />
              <span className="text-muted-foreground">
                Weak / Overperforming (likely to regress)
              </span>
            </div>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium">No data available</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try selecting a different season.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
