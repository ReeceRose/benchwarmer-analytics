import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Trophy, Filter, ArrowUpDown } from "lucide-react";
import { useLeaderboard, useSeasons } from "@/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ErrorState } from "@/components/shared";
import { formatPosition, formatToi, formatPercent, formatSavePct } from "@/lib/formatters";
import {
  isGoalieCategory,
  getDefaultSortDir,
} from "@/lib/leaderboard-categories";
import type { LeaderboardCategory, LeaderboardEntry } from "@/types";

const categorySchema = z.enum([
  "points",
  "goals",
  "assists",
  "expectedGoals",
  "corsiPct",
  "iceTime",
  "gamesPlayed",
  "savePct",
  "gaa",
  "gsax",
  "shotsAgainst",
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

interface SortableHeaderProps {
  label: string;
  tooltip: string;
  sortKey: string;
  currentSort: string;
  sortDesc: boolean;
  onSort: (key: string) => void;
  isHighlighted?: boolean;
  className?: string;
  /** If true, the arrow direction is inverted to indicate "lower is better" semantics */
  lowerIsBetter?: boolean;
}

function SortableHeader({
  label,
  tooltip,
  sortKey,
  currentSort,
  sortDesc,
  onSort,
  isHighlighted,
  className,
  lowerIsBetter = false,
}: SortableHeaderProps) {
  const isActive = currentSort === sortKey;
  // For "lower is better" stats like GAA, invert the arrow direction
  // so ascending (best values first) shows the down arrow
  const showDescArrow = lowerIsBetter ? !sortDesc : sortDesc;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <TableHead
          className={`text-right cursor-pointer hover:bg-muted/50 transition-colors ${
            isHighlighted ? "bg-muted/30 font-semibold" : ""
          } ${className ?? ""}`}
          onClick={() => onSort(sortKey)}
        >
          <span className="flex items-center justify-end gap-1 whitespace-nowrap">
            {label}
            {isActive && (
              <ArrowUpDown className={`h-3 w-3 shrink-0 ${showDescArrow ? "" : "rotate-180"}`} />
            )}
          </span>
        </TableHead>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function LeaderboardsPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const { category = "points", season, situation, sortDir } = Route.useSearch();

  const { data: seasonsData } = useSeasons();
  const currentSeason = seasonsData?.seasons?.[0]?.year;

  const effectiveSeason = season ?? currentSeason;
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
    effectiveSortDir
  );

  // Use server-sorted entries directly (no client-side re-sorting needed)
  const sortedEntries = data?.entries ?? [];

  const updateSearch = (updates: Partial<{ category: LeaderboardCategory; season: number; situation: string; sortDir: "asc" | "desc" }>) => {
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
      updateSearch({ category: key as LeaderboardCategory, sortDir: undefined });
    }
  };

  const handlePlayerTypeChange = (type: string) => {
    // Switch to default category for that player type
    const newCategory = type === "goalies" ? "savePct" : "points";
    updateSearch({ category: newCategory as LeaderboardCategory, sortDir: undefined });
  };

  return (
    <div className="container py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">League Leaders</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl">
          Top performers across key statistical categories. Click column headers to sort.
        </p>
      </div>

      {/* Filters */}
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
                    <SortableHeader
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
                        <SortableHeader
                          label="P"
                          tooltip="Total points (goals + assists)"
                          sortKey="points"
                          currentSort={sortKey}
                          sortDesc={sortDesc}
                          onSort={handleSort}
                          isHighlighted={sortKey === "points"}
                          className="w-14"
                        />
                        <SortableHeader
                          label="G"
                          tooltip="Goals scored"
                          sortKey="goals"
                          currentSort={sortKey}
                          sortDesc={sortDesc}
                          onSort={handleSort}
                          isHighlighted={sortKey === "goals"}
                          className="w-14"
                        />
                        <SortableHeader
                          label="A"
                          tooltip="Assists"
                          sortKey="assists"
                          currentSort={sortKey}
                          sortDesc={sortDesc}
                          onSort={handleSort}
                          isHighlighted={sortKey === "assists"}
                          className="w-14"
                        />
                        <SortableHeader
                          label="xG"
                          tooltip="Expected goals based on shot quality"
                          sortKey="expectedGoals"
                          currentSort={sortKey}
                          sortDesc={sortDesc}
                          onSort={handleSort}
                          isHighlighted={sortKey === "expectedGoals"}
                          className="w-16"
                        />
                        <SortableHeader
                          label="CF%"
                          tooltip="Corsi for % - shot attempt share when on ice"
                          sortKey="corsiPct"
                          currentSort={sortKey}
                          sortDesc={sortDesc}
                          onSort={handleSort}
                          isHighlighted={sortKey === "corsiPct"}
                          className="w-18"
                        />
                        <SortableHeader
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
                        <SortableHeader
                          label="Sv%"
                          tooltip="Save percentage"
                          sortKey="savePct"
                          currentSort={sortKey}
                          sortDesc={sortDesc}
                          onSort={handleSort}
                          isHighlighted={sortKey === "savePct"}
                          className="w-16"
                        />
                        <SortableHeader
                          label="GAA"
                          tooltip="Goals against average (lower is better)"
                          sortKey="gaa"
                          currentSort={sortKey}
                          sortDesc={sortDesc}
                          onSort={handleSort}
                          isHighlighted={sortKey === "gaa"}
                          lowerIsBetter
                          className="w-16"
                        />
                        <SortableHeader
                          label="GSAx"
                          tooltip="Goals saved above expected"
                          sortKey="gsax"
                          currentSort={sortKey}
                          sortDesc={sortDesc}
                          onSort={handleSort}
                          isHighlighted={sortKey === "gsax"}
                          className="w-18"
                        />
                        <SortableHeader
                          label="SA"
                          tooltip="Shots against"
                          sortKey="shotsAgainst"
                          currentSort={sortKey}
                          sortDesc={sortDesc}
                          onSort={handleSort}
                          isHighlighted={sortKey === "shotsAgainst"}
                          className="w-16"
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

function LeaderboardRow({
  entry,
  rank,
  isGoalie,
  highlightedColumn,
}: {
  entry: LeaderboardEntry;
  rank: number;
  isGoalie: boolean;
  highlightedColumn: string;
}) {
  const cellClass = (col: string) =>
    `text-right tabular-nums ${highlightedColumn === col ? "bg-muted/30 font-semibold" : ""}`;

  return (
    <TableRow>
      <TableCell className="font-medium text-muted-foreground tabular-nums">{rank}</TableCell>
      <TableCell>
        <Link
          to="/players/$id"
          params={{ id: String(entry.playerId) }}
          className="hover:underline font-medium"
        >
          {entry.name}
        </Link>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="font-normal">
          {formatPosition(entry.position)}
        </Badge>
      </TableCell>
      <TableCell>
        {entry.team ? (
          <Link
            to="/teams/$abbrev"
            params={{ abbrev: entry.team }}
            className="hover:underline text-muted-foreground"
          >
            {entry.team}
          </Link>
        ) : (
          "-"
        )}
      </TableCell>
      <TableCell className={cellClass("gamesPlayed")}>{entry.gamesPlayed}</TableCell>
      {!isGoalie ? (
        <>
          <TableCell className={cellClass("points")}>
            {(entry.goals ?? 0) + (entry.assists ?? 0)}
          </TableCell>
          <TableCell className={cellClass("goals")}>{entry.goals ?? "-"}</TableCell>
          <TableCell className={cellClass("assists")}>{entry.assists ?? "-"}</TableCell>
          <TableCell className={cellClass("expectedGoals")}>
            {entry.expectedGoals != null ? entry.expectedGoals.toFixed(1) : "-"}
          </TableCell>
          <TableCell className={cellClass("corsiPct")}>
            {entry.corsiForPct != null ? formatPercent(entry.corsiForPct, false) : "-"}
          </TableCell>
          <TableCell className={cellClass("iceTime")}>
            {entry.iceTimeSeconds != null ? formatToi(entry.iceTimeSeconds) : "-"}
          </TableCell>
        </>
      ) : (
        <>
          <TableCell className={cellClass("savePct")}>
            {entry.savePercentage != null ? formatSavePct(entry.savePercentage) : "-"}
          </TableCell>
          <TableCell className={cellClass("gaa")}>
            {entry.goalsAgainstAverage != null ? entry.goalsAgainstAverage.toFixed(2) : "-"}
          </TableCell>
          <TableCell className={cellClass("gsax")}>
            {entry.goalsSavedAboveExpected != null
              ? entry.goalsSavedAboveExpected >= 0
                ? `+${entry.goalsSavedAboveExpected.toFixed(1)}`
                : entry.goalsSavedAboveExpected.toFixed(1)
              : "-"}
          </TableCell>
          <TableCell className={cellClass("shotsAgainst")}>
            {entry.shotsAgainst ?? "-"}
          </TableCell>
        </>
      )}
    </TableRow>
  );
}
