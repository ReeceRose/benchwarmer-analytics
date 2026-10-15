import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { seasonsQueryOptions } from "@/hooks/useSeasons";
import { usePowerRankings, useSeasons, usePageTitle } from "@/hooks";
import { getCurrentSeason } from "@/lib/date-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ErrorState, SeasonSelector, SortableTableHeader, TableSkeleton } from "@/components/shared";
import { ChartLegend } from "@/components/charts/ChartLegend";
import { EmptyState, MetricGuide, PageHeader, ViewToggle } from "@/components/layout";
import { TeamRow, RegressionCard } from "@/components/power-rankings";
import {
  FormShiftChart,
  TeamRankingBars,
  LuckQuadrantChart,
  PointsExpectedChart,
  QualityVsQuantityChart,
} from "@/components/power-rankings/charts";
import * as z from "zod/mini";
import type { TeamPowerRanking } from "@/types";

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
  "recentXGoalsPct",
  "corsiPct",
  "fenwickPct",
  "shootingPct",
  "savePct",
  "pdo",
  "pointsDiff",
  "scheduleStrength",
  "remainingScheduleStrength",
]);

type SortKey = z.infer<typeof sortKeySchema>;

const searchSchema = z.object({
  season: z.optional(z.number()),
  sortKey: z.optional(sortKeySchema),
  sortDir: z.optional(z.enum(["asc", "desc"])),
  view: z.optional(z.enum(["charts", "table"])),
});

export const Route = createFileRoute("/power-rankings")({
  component: PowerRankingsPage,
  loader: ({ context }) =>
    context.queryClient.prefetchQuery(seasonsQueryOptions),
  validateSearch: searchSchema,
});

function PowerRankingsPage() {
  usePageTitle("Power Rankings");

  // Use calculated default season immediately - don't wait for API
  const defaultSeason = getCurrentSeason();
  const { data: seasonsData } = useSeasons();
  const apiCurrentSeason = seasonsData?.seasons?.[0]?.year;

  const navigate = useNavigate({ from: Route.fullPath });
  const {
    season,
    sortKey: urlSortKey,
    sortDir: urlSortDir,
    view: urlView,
  } = Route.useSearch();

  // Prefer URL param > API current season > calculated default
  const effectiveSeason = season ?? apiCurrentSeason ?? defaultSeason;
  const isCurrentSeason =
    effectiveSeason === (apiCurrentSeason ?? defaultSeason);
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
            return team.gamesPlayed > 0
              ? team.points / (team.gamesPlayed * 2)
              : 0;
          case "gfPerGame":
            return team.gamesPlayed > 0 ? team.goalsFor / team.gamesPlayed : 0;
          case "gaPerGame":
            return team.gamesPlayed > 0
              ? team.goalsAgainst / team.gamesPlayed
              : 0;
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

  const updateSearch = (
    updates: Partial<{
      season: number;
      sortKey: SortKey;
      sortDir: "asc" | "desc";
      view: "charts" | "table";
    }>,
  ) => {
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
    <div className="container space-y-6 py-8">
      <PageHeader
        title="Power rankings"
        description="Standings and underlying numbers side by side, to show which teams are better or worse than their record."
        actions={
          <>
            <SeasonSelector
              value={effectiveSeason}
              onValueChange={(v) => v != null && updateSearch({ season: v })}
            />
            <ViewToggle
              value={currentView}
              onValueChange={(view) => updateSearch({ view })}
            />
          </>
        }
      />

      <MetricGuide
        metrics={["Pts%", "xG±", "xPts", "xG%", "L10 xG%", "CF%", "FF%", "Sh%", "Sv%", "PDO", "Pts±", "SOS", "Rem. SOS", "PP%", "PK%"]}
      />

      {isCurrentSeason &&
        data?.insights &&
        (data.insights.likelyToImprove.length > 0 ||
          data.insights.likelyToRegress.length > 0) && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <RegressionCard
              title="Likely to improve"
              description="Underlying numbers better than the record."
              candidates={data.insights.likelyToImprove}
              season={effectiveSeason}
            />
            <RegressionCard
              title="Likely to regress"
              description="Record better than the underlying numbers."
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
        currentView === "charts" ? (
          <ChartsSkeleton />
        ) : (
          <TableSkeleton rows={10} columns={12} />
        )
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
        !error && (
          <EmptyState
            title="No rankings for this season yet"
            hint="Pick another season from the menu above."
          />
        )
      )}
    </div>
  );
}

// Record first, then whether it's deserved, then recent form, then the why.
function ChartsView({
  teams,
  season,
}: {
  teams: TeamPowerRanking[];
  season?: number;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TeamRankingBars teams={teams} season={season} />
        <PointsExpectedChart teams={teams} season={season} />
      </div>

      <FormShiftChart teams={teams} season={season} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <QualityVsQuantityChart teams={teams} season={season} />
        <LuckQuadrantChart teams={teams} season={season} />
      </div>
    </div>
  );
}

function ChartsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-256 rounded-2xl" />
        <Skeleton className="h-256 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-136 rounded-2xl" />
        <Skeleton className="h-136 rounded-2xl" />
      </div>
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
      <Card className="gap-0 overflow-hidden py-0">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="table-fixed min-w-460">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead className="sticky left-0 z-10 w-52 bg-card">Team</TableHead>
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
                    label="L10 xG%"
                    metric="L10 xG%"
                    sortKey="recentXGoalsPct"
                    currentSort={sortKey}
                    sortDesc={sortDesc}
                    onSort={onSort}
                    isHighlighted={sortKey === "recentXGoalsPct"}
                    className="w-20"
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
                  <SortableTableHeader
                    label="SOS"
                    metric="SOS"
                    sortKey="scheduleStrength"
                    currentSort={sortKey}
                    sortDesc={sortDesc}
                    onSort={onSort}
                    isHighlighted={sortKey === "scheduleStrength"}
                    className="w-16"
                  />
                  <SortableTableHeader
                    label="Rem. SOS"
                    metric="Rem. SOS"
                    sortKey="remainingScheduleStrength"
                    currentSort={sortKey}
                    sortDesc={sortDesc}
                    onSort={onSort}
                    isHighlighted={sortKey === "remainingScheduleStrength"}
                    className="w-20"
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
      <ChartLegend
        className="mt-3"
        items={[
          { label: "Strong, or below expected (room to improve)", colour: "var(--success)" },
          { label: "Average, or sustainable", colour: "var(--muted-foreground)" },
          { label: "Weak, or above expected (likely to regress)", colour: "var(--error)" },
        ]}
      />
    </>
  );
}
