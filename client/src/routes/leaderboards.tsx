import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Trophy, Filter } from "lucide-react";
import { useLeaderboard, useSeasons } from "@/hooks";
import { getCurrentSeason } from "@/lib/date-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { LeaderboardRow } from "@/components/leaderboard";
import {
  isGoalieCategory,
  getDefaultSortDir,
} from "@/lib/leaderboard-categories";
import type { LeaderboardCategory } from "@/types";

const categorySchema = z.enum([
  // Skater categories
  "points",
  "goals",
  "assists",
  "shots",
  "expectedGoals",
  "xgPer60",
  "corsiPct",
  "fenwickPct",
  "oiShPct",
  "oiSvPct",
  "iceTime",
  "gamesPlayed",
  // Goalie categories
  "savePct",
  "gaa",
  "gsax",
  "shotsAgainst",
  "goalieTime",
  "goalsAgainst",
  "xga",
]);

const searchSchema = z.object({
  category: categorySchema.optional(),
  season: z.number().optional(),
  situation: z.string().optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});

export const Route = createFileRoute("/leaderboards")({
  component: LeaderboardsPage,
  validateSearch: searchSchema,
});

function LeaderboardsPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const { category = "points", season, situation, sortDir } = Route.useSearch();

  // Use calculated default season immediately - don't wait for API
  const defaultSeason = getCurrentSeason();
  const { data: seasonsData } = useSeasons();

  // Prefer URL param > API current season > calculated default
  const effectiveSeason =
    season ?? seasonsData?.seasons?.[0]?.year ?? defaultSeason;
  const effectiveSituation = situation ?? "all";

  // Determine if viewing skaters or goalies based on category
  const isGoalieView = isGoalieCategory(category);

  // The current category is the sort key
  const sortKey = category;

  // Sort state - use URL sortDir or default based on category
  const effectiveSortDir = sortDir ?? getDefaultSortDir(category);
  const sortDesc = effectiveSortDir === "desc";

  // Fetch data - server returns pre-sorted results
  const { data, isLoading, isPlaceholderData, error, refetch } = useLeaderboard(
    category,
    effectiveSeason,
    effectiveSituation,
    50,
    effectiveSortDir,
  );

  // Use server-sorted entries directly (no client-side re-sorting needed)
  const sortedEntries = data?.entries ?? [];

  const updateSearch = (
    updates: Partial<{
      category: LeaderboardCategory;
      season: number;
      situation: string;
      sortDir: "asc" | "desc";
    }>,
  ) => {
    navigate({
      search: (prev) => ({
        ...prev,
        ...updates,
      }),
    });
  };

  const handleSort = (key: string) => {
    if (key === sortKey) {
      // Toggle direction if clicking same column
      updateSearch({ sortDir: sortDesc ? "asc" : "desc" });
    } else {
      // New column - use default direction for that column, clear sortDir to use default
      updateSearch({
        category: key as LeaderboardCategory,
        sortDir: undefined,
      });
    }
  };

  const handlePlayerTypeChange = (type: string) => {
    // Switch to default category for that player type
    const newCategory = type === "goalies" ? "savePct" : "points";
    updateSearch({
      category: newCategory as LeaderboardCategory,
      sortDir: undefined,
    });
  };

  return (
    <div className="container py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">League Leaders</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl">
          Top performers across key statistical categories. Click column headers
          to sort.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <Tabs
          value={isGoalieView ? "goalies" : "skaters"}
          onValueChange={handlePlayerTypeChange}
        >
          <TabsList>
            <TabsTrigger value="skaters">Skaters</TabsTrigger>
            <TabsTrigger value="goalies">Goalies</TabsTrigger>
          </TabsList>
        </Tabs>

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

        {!isGoalieView && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Situation:</span>
            <Select
              value={effectiveSituation}
              onValueChange={(v) => updateSearch({ situation: v })}
            >
              <SelectTrigger className="w-28 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="5on5">5v5</SelectItem>
                <SelectItem value="5on4">PP</SelectItem>
                <SelectItem value="4on5">PK</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {isGoalieView && (
          <span className="text-sm text-muted-foreground italic">
            Goalie stats shown for all situations
          </span>
        )}
      </div>

      {error && (
        <ErrorState
          title="Failed to load leaderboard"
          message="Could not fetch leaderboard data. Please try again."
          onRetry={() => refetch()}
        />
      )}

      {isLoading ? (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : sortedEntries.length > 0 ? (
        <Card className={`py-0 gap-0 ${isPlaceholderData ? "opacity-60" : ""}`}>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="table-fixed min-w-175">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="w-44">Player</TableHead>
                    <TableHead className="w-20">Pos</TableHead>
                    <TableHead className="w-16">Team</TableHead>
                    <SortableTableHeader
                      label="GP"
                      tooltip="Games played"
                      sortKey="gamesPlayed"
                      currentSort={sortKey}
                      sortDesc={sortDesc}
                      onSort={handleSort}
                      isHighlighted={sortKey === "gamesPlayed"}
                      className="w-16"
                    />
                    {!isGoalieView ? (
                      <>
                        <SortableTableHeader
                          label="P"
                          tooltip="Total points (goals + assists)"
                          metric="P"
                          sortKey="points"
                          currentSort={sortKey}
                          sortDesc={sortDesc}
                          onSort={handleSort}
                          isHighlighted={sortKey === "points"}
                          className="w-14"
                        />
                        <SortableTableHeader
                          label="G"
                          tooltip="Goals scored"
                          sortKey="goals"
                          currentSort={sortKey}
                          sortDesc={sortDesc}
                          onSort={handleSort}
                          isHighlighted={sortKey === "goals"}
                          className="w-14"
                        />
                        <SortableTableHeader
                          label="A"
                          tooltip="Assists"
                          sortKey="assists"
                          currentSort={sortKey}
                          sortDesc={sortDesc}
                          onSort={handleSort}
                          isHighlighted={sortKey === "assists"}
                          className="w-14"
                        />
                        <SortableTableHeader
                          label="S"
                          tooltip="Shots on goal"
                          sortKey="shots"
                          currentSort={sortKey}
                          sortDesc={sortDesc}
                          onSort={handleSort}
                          isHighlighted={sortKey === "shots"}
                          className="w-14"
                        />
                        <SortableTableHeader
                          label="xG"
                          tooltip="Expected goals based on shot quality"
                          sortKey="expectedGoals"
                          currentSort={sortKey}
                          sortDesc={sortDesc}
                          onSort={handleSort}
                          isHighlighted={sortKey === "expectedGoals"}
                          className="w-16"
                        />
                        <SortableTableHeader
                          label="xG/60"
                          tooltip="Expected goals per 60 minutes"
                          metric="xG/60"
                          sortKey="xgPer60"
                          currentSort={sortKey}
                          sortDesc={sortDesc}
                          onSort={handleSort}
                          isHighlighted={sortKey === "xgPer60"}
                          className="w-18"
                        />
                        <SortableTableHeader
                          label="CF%"
                          tooltip="Corsi for % - shot attempt share when on ice"
                          metric="CF%"
                          sortKey="corsiPct"
                          currentSort={sortKey}
                          sortDesc={sortDesc}
                          onSort={handleSort}
                          isHighlighted={sortKey === "corsiPct"}
                          className="w-18"
                        />
                        <SortableTableHeader
                          label="FF%"
                          tooltip="Fenwick for % - unblocked shot attempt share"
                          metric="FF%"
                          sortKey="fenwickPct"
                          currentSort={sortKey}
                          sortDesc={sortDesc}
                          onSort={handleSort}
                          isHighlighted={sortKey === "fenwickPct"}
                          className="w-18"
                        />
                        <SortableTableHeader
                          label="oiSh%"
                          tooltip="On-ice shooting % - team shooting % when on ice"
                          metric="oiSH%"
                          sortKey="oiShPct"
                          currentSort={sortKey}
                          sortDesc={sortDesc}
                          onSort={handleSort}
                          isHighlighted={sortKey === "oiShPct"}
                          className="w-18"
                        />
                        <SortableTableHeader
                          label="oiSv%"
                          tooltip="On-ice save % - team save % when on ice"
                          metric="oiSV%"
                          sortKey="oiSvPct"
                          currentSort={sortKey}
                          sortDesc={sortDesc}
                          onSort={handleSort}
                          isHighlighted={sortKey === "oiSvPct"}
                          className="w-18"
                        />
                        <SortableTableHeader
                          label="TOI"
                          tooltip="Total time on ice"
                          sortKey="iceTime"
                          currentSort={sortKey}
                          sortDesc={sortDesc}
                          onSort={handleSort}
                          isHighlighted={sortKey === "iceTime"}
                          className="w-20"
                        />
                      </>
                    ) : (
                      <>
                        <SortableTableHeader
                          label="Sv%"
                          tooltip="Save percentage"
                          metric="SV%"
                          sortKey="savePct"
                          currentSort={sortKey}
                          sortDesc={sortDesc}
                          onSort={handleSort}
                          isHighlighted={sortKey === "savePct"}
                          className="w-16"
                        />
                        <SortableTableHeader
                          label="GAA"
                          tooltip="Goals against average (lower is better)"
                          metric="GAA"
                          sortKey="gaa"
                          currentSort={sortKey}
                          sortDesc={sortDesc}
                          onSort={handleSort}
                          isHighlighted={sortKey === "gaa"}
                          lowerIsBetter
                          className="w-16"
                        />
                        <SortableTableHeader
                          label="GSAx"
                          tooltip="Goals saved above expected"
                          metric="GSAx"
                          sortKey="gsax"
                          currentSort={sortKey}
                          sortDesc={sortDesc}
                          onSort={handleSort}
                          isHighlighted={sortKey === "gsax"}
                          className="w-18"
                        />
                        <SortableTableHeader
                          label="SA"
                          tooltip="Shots against"
                          sortKey="shotsAgainst"
                          currentSort={sortKey}
                          sortDesc={sortDesc}
                          onSort={handleSort}
                          isHighlighted={sortKey === "shotsAgainst"}
                          className="w-16"
                        />
                        <SortableTableHeader
                          label="TOI"
                          tooltip="Total time on ice"
                          sortKey="goalieTime"
                          currentSort={sortKey}
                          sortDesc={sortDesc}
                          onSort={handleSort}
                          isHighlighted={sortKey === "goalieTime"}
                          className="w-20"
                        />
                        <SortableTableHeader
                          label="GA"
                          tooltip="Goals against (lower is better)"
                          sortKey="goalsAgainst"
                          currentSort={sortKey}
                          sortDesc={sortDesc}
                          onSort={handleSort}
                          isHighlighted={sortKey === "goalsAgainst"}
                          lowerIsBetter
                          className="w-14"
                        />
                        <SortableTableHeader
                          label="xGA"
                          tooltip="Expected goals against (lower is better)"
                          metric="xGA"
                          sortKey="xga"
                          currentSort={sortKey}
                          sortDesc={sortDesc}
                          onSort={handleSort}
                          isHighlighted={sortKey === "xga"}
                          lowerIsBetter
                          className="w-16"
                        />
                        <SortableTableHeader
                          label="HD Sv%"
                          tooltip="High danger save percentage"
                          sortKey="savePct"
                          currentSort={sortKey}
                          sortDesc={sortDesc}
                          onSort={handleSort}
                          isHighlighted={false}
                          className="w-18"
                        />
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedEntries.map((entry) => (
                    <LeaderboardRow
                      key={entry.playerId}
                      entry={entry}
                      rank={entry.rank}
                      season={effectiveSeason}
                      isGoalie={isGoalieView}
                      highlightedColumn={sortKey}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium">No data found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try selecting a different season or situation.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
