import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Trophy, Info, Filter, BarChart3, TableIcon } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { ErrorState, SortableTableHeader } from "@/components/shared";
import { TeamRow, RegressionCard } from "@/components/power-rankings";
import {
  TeamRankingBars,
  LuckQuadrantChart,
  PointsExpectedChart,
  QualityVsQuantityChart,
} from "@/components/power-rankings/charts";
import { z } from "zod";

const sortKeySchema = z.enum([
  "gamesPlayed",
  "wins",
  "losses",
  "otLosses",
  "points",
  "pointsPct",
  "goalsFor",
  "goalsAgainst",
  "goalDiff",
  "gfPerGame",
  "gaPerGame",
  "xGoalsFor",
  "xGoalsAgainst",
  "xGoalDiff",
  "expectedPoints",
  "ppPct",
  "pkPct",
  "xGoalsPct",
  "corsiPct",
  "fenwickPct",
  "shootingPct",
  "savePct",
  "pdo",
  "pointsDiff",
]);

type SortKey = z.infer<typeof sortKeySchema>;

const searchSchema = z.object({
  season: z.number().optional(),
  sortKey: sortKeySchema.optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
  view: z.enum(["charts", "table"]).optional(),
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
  const { season, sortKey: urlSortKey, sortDir: urlSortDir, view: urlView } = Route.useSearch();

  // Prefer URL param > API current season > calculated default
  const effectiveSeason = season ?? apiCurrentSeason ?? defaultSeason;
  const isCurrentSeason = effectiveSeason === (apiCurrentSeason ?? defaultSeason);
  const { data, isLoading, error, refetch } = usePowerRankings(effectiveSeason);

  // View state from URL with default to table
  const currentView = urlView ?? "table";

  // Sort state from URL with defaults
  const sortKey: SortKey = urlSortKey ?? "points";
  const sortDesc = urlSortDir ? urlSortDir === "desc" : true;

  // Sort teams client-side based on URL params
  const sortedTeams = (() => {
    if (!data?.teams) return [];
    const teams = [...data.teams];
    teams.sort((a, b) => {
      const getValue = (team: typeof a) => {
        switch (sortKey) {
          case "goalDiff":
            return team.goalsFor - team.goalsAgainst;
          case "pointsPct":
            return team.gamesPlayed > 0 ? team.points / (team.gamesPlayed * 2) : 0;
          case "gfPerGame":
            return team.gamesPlayed > 0 ? team.goalsFor / team.gamesPlayed : 0;
          case "gaPerGame":
            return team.gamesPlayed > 0 ? team.goalsAgainst / team.gamesPlayed : 0;
          case "xGoalDiff":
            return team.xGoalsFor - team.xGoalsAgainst;
          default:
            return Number(team[sortKey] ?? 0);
        }
      };
      const aVal = getValue(a);
      const bVal = getValue(b);
      return sortDesc ? bVal - aVal : aVal - bVal;
    });
    return teams;
  })();

  const updateSearch = (updates: Partial<{ season: number; sortKey: SortKey; sortDir: "asc" | "desc"; view: "charts" | "table" }>) => {
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
            <strong>Pts%</strong> (points earned / possible),{" "}
            <strong>xGF/xGA</strong> (expected goals for/against),{" "}
            <strong>xG±</strong> (expected goal differential),{" "}
            <strong>xPts</strong> (expected points),{" "}
            <strong>xG%</strong> (expected goals share),{" "}
            <strong>CF%/FF%</strong> (shot attempt share),{" "}
            <strong>Sh%/Sv%</strong> (shooting/save percentage),{" "}
            <strong>PDO</strong> (Sh% + Sv% - values near 100 are sustainable),{" "}
            <strong>Pts±</strong> (actual - expected points).
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
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

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button
            variant={currentView === "charts" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => updateSearch({ view: "charts" })}
            className="gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Charts
          </Button>
          <Button
            variant={currentView === "table" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => updateSearch({ view: "table" })}
            className="gap-2"
          >
            <TableIcon className="h-4 w-4" />
            Table
          </Button>
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
        currentView === "charts" ? (
          <ChartsView teams={data.teams} season={effectiveSeason} />
        ) : (
          <TableView
            teams={sortedTeams}
            sortKey={sortKey}
            sortDesc={sortDesc}
            onSort={handleSort}
            season={effectiveSeason}
          />
        )
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

// Charts View Component
import type { TeamPowerRanking } from "@/types";

function ChartsView({ teams, season }: { teams: TeamPowerRanking[]; season?: number }) {
  return (
    <div className="space-y-6">
      {/* Top row: Ranking bars full width */}
      <TeamRankingBars teams={teams} season={season} />

      {/* Second row: 2 scatter plots side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LuckQuadrantChart teams={teams} season={season} />
        <QualityVsQuantityChart teams={teams} season={season} />
      </div>

      {/* Third row: Expected vs Actual Points full width */}
      <PointsExpectedChart teams={teams} season={season} />
    </div>
  );
}

// Table View Component
function TableView({
  teams,
  sortKey,
  sortDesc,
  onSort,
  season,
}: {
  teams: TeamPowerRanking[];
  sortKey: SortKey;
  sortDesc: boolean;
  onSort: (key: string) => void;
  season?: number;
}) {
  return (
    <>
      <Card className="py-0 gap-0">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="table-fixed min-w-400">
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
                    onSort={onSort}
                    isHighlighted={sortKey === "gamesPlayed"}
                    className="w-12"
                  />
                  <SortableTableHeader
                    label="W"
                    tooltip="Wins"
                    sortKey="wins"
                    currentSort={sortKey}
                    sortDesc={sortDesc}
                    onSort={onSort}
                    isHighlighted={sortKey === "wins"}
                    className="w-12"
                  />
                  <SortableTableHeader
                    label="L"
                    tooltip="Losses"
                    sortKey="losses"
                    currentSort={sortKey}
                    sortDesc={sortDesc}
                    onSort={onSort}
                    isHighlighted={sortKey === "losses"}
                    className="w-12"
                  />
                  <SortableTableHeader
                    label="OTL"
                    tooltip="Overtime losses"
                    sortKey="otLosses"
                    currentSort={sortKey}
                    sortDesc={sortDesc}
                    onSort={onSort}
                    isHighlighted={sortKey === "otLosses"}
                    className="w-12"
                  />
                  <SortableTableHeader
                    label="Pts"
                    tooltip="Points (W×2 + OTL)"
                    sortKey="points"
                    currentSort={sortKey}
                    sortDesc={sortDesc}
                    onSort={onSort}
                    isHighlighted={sortKey === "points"}
                    className="w-12"
                  />
                  <SortableTableHeader
                    label="Pts%"
                    tooltip="Points percentage (points earned / possible points)"
                    metric="Pts%"
                    sortKey="pointsPct"
                    currentSort={sortKey}
                    sortDesc={sortDesc}
                    onSort={onSort}
                    isHighlighted={sortKey === "pointsPct"}
                    className="w-14"
                  />
                  <SortableTableHeader
                    label="GF"
                    tooltip="Goals for"
                    sortKey="goalsFor"
                    currentSort={sortKey}
                    sortDesc={sortDesc}
                    onSort={onSort}
                    isHighlighted={sortKey === "goalsFor"}
                    className="w-12"
                  />
                  <SortableTableHeader
                    label="GA"
                    tooltip="Goals against"
                    sortKey="goalsAgainst"
                    currentSort={sortKey}
                    sortDesc={sortDesc}
                    onSort={onSort}
                    isHighlighted={sortKey === "goalsAgainst"}
                    className="w-12"
                  />
                  <SortableTableHeader
                    label="Diff"
                    tooltip="Goal differential (GF - GA)"
                    metric="Diff"
                    sortKey="goalDiff"
                    currentSort={sortKey}
                    sortDesc={sortDesc}
                    onSort={onSort}
                    isHighlighted={sortKey === "goalDiff"}
                    className="w-14"
                  />
                  <SortableTableHeader
                    label="GF/G"
                    tooltip="Goals for per game"
                    sortKey="gfPerGame"
                    currentSort={sortKey}
                    sortDesc={sortDesc}
                    onSort={onSort}
                    isHighlighted={sortKey === "gfPerGame"}
                    className="w-14"
                  />
                  <SortableTableHeader
                    label="GA/G"
                    tooltip="Goals against per game"
                    sortKey="gaPerGame"
                    currentSort={sortKey}
                    sortDesc={sortDesc}
                    onSort={onSort}
                    isHighlighted={sortKey === "gaPerGame"}
                    className="w-14"
                  />
                  <SortableTableHeader
                    label="xGF"
                    tooltip="Expected goals for"
                    sortKey="xGoalsFor"
                    currentSort={sortKey}
                    sortDesc={sortDesc}
                    onSort={onSort}
                    isHighlighted={sortKey === "xGoalsFor"}
                    className="w-14"
                  />
                  <SortableTableHeader
                    label="xGA"
                    tooltip="Expected goals against"
                    metric="xGA"
                    sortKey="xGoalsAgainst"
                    currentSort={sortKey}
                    sortDesc={sortDesc}
                    onSort={onSort}
                    isHighlighted={sortKey === "xGoalsAgainst"}
                    className="w-14"
                  />
                  <SortableTableHeader
                    label="xG±"
                    tooltip="Expected goal differential (xGF - xGA)"
                    metric="xG±"
                    sortKey="xGoalDiff"
                    currentSort={sortKey}
                    sortDesc={sortDesc}
                    onSort={onSort}
                    isHighlighted={sortKey === "xGoalDiff"}
                    className="w-14"
                  />
                  <SortableTableHeader
                    label="xPts"
                    tooltip="Expected points based on analytics"
                    metric="xPts"
                    sortKey="expectedPoints"
                    currentSort={sortKey}
                    sortDesc={sortDesc}
                    onSort={onSort}
                    isHighlighted={sortKey === "expectedPoints"}
                    className="w-14"
                  />
                  <SortableTableHeader
                    label="PP%"
                    tooltip="Power play percentage"
                    metric="PP%"
                    sortKey="ppPct"
                    currentSort={sortKey}
                    sortDesc={sortDesc}
                    onSort={onSort}
                    isHighlighted={sortKey === "ppPct"}
                    className="w-14"
                  />
                  <SortableTableHeader
                    label="PK%"
                    tooltip="Penalty kill percentage"
                    metric="PK%"
                    sortKey="pkPct"
                    currentSort={sortKey}
                    sortDesc={sortDesc}
                    onSort={onSort}
                    isHighlighted={sortKey === "pkPct"}
                    className="w-14"
                  />
                  <SortableTableHeader
                    label="xG%"
                    tooltip="Expected goals percentage (share of expected goals)"
                    metric="xG%"
                    sortKey="xGoalsPct"
                    currentSort={sortKey}
                    sortDesc={sortDesc}
                    onSort={onSort}
                    isHighlighted={sortKey === "xGoalsPct"}
                    className="w-14"
                  />
                  <SortableTableHeader
                    label="CF%"
                    tooltip="Corsi percentage (shot attempt share)"
                    metric="CF%"
                    sortKey="corsiPct"
                    currentSort={sortKey}
                    sortDesc={sortDesc}
                    onSort={onSort}
                    isHighlighted={sortKey === "corsiPct"}
                    className="w-14"
                  />
                  <SortableTableHeader
                    label="FF%"
                    tooltip="Fenwick percentage (unblocked shot attempt share)"
                    metric="FF%"
                    sortKey="fenwickPct"
                    currentSort={sortKey}
                    sortDesc={sortDesc}
                    onSort={onSort}
                    isHighlighted={sortKey === "fenwickPct"}
                    className="w-14"
                  />
                  <SortableTableHeader
                    label="Sh%"
                    tooltip="Team shooting percentage"
                    metric="Sh%"
                    sortKey="shootingPct"
                    currentSort={sortKey}
                    sortDesc={sortDesc}
                    onSort={onSort}
                    isHighlighted={sortKey === "shootingPct"}
                    className="w-14"
                  />
                  <SortableTableHeader
                    label="Sv%"
                    tooltip="Team save percentage"
                    metric="Sv%"
                    sortKey="savePct"
                    currentSort={sortKey}
                    sortDesc={sortDesc}
                    onSort={onSort}
                    isHighlighted={sortKey === "savePct"}
                    className="w-14"
                  />
                  <SortableTableHeader
                    label="PDO"
                    tooltip="Shooting% + Save% (values near 100 are sustainable)"
                    metric="PDO"
                    sortKey="pdo"
                    currentSort={sortKey}
                    sortDesc={sortDesc}
                    onSort={onSort}
                    isHighlighted={sortKey === "pdo"}
                    className="w-14"
                  />
                  <SortableTableHeader
                    label="Pts±"
                    tooltip="Points above/below expected (positive = overperforming)"
                    metric="Pts±"
                    sortKey="pointsDiff"
                    currentSort={sortKey}
                    sortDesc={sortDesc}
                    onSort={onSort}
                    isHighlighted={sortKey === "pointsDiff"}
                    className="w-14"
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((team, index) => (
                  <TeamRow
                    key={team.abbreviation}
                    team={team}
                    rank={index + 1}
                    season={season}
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
  );
}
