import { useState, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { GitCompare, Search, X, Plus, Filter, Loader2 } from "lucide-react";
import { usePlayerSearch, usePlayerComparison, useSeasons } from "@/hooks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { BackButton, SeasonSelector, ErrorState } from "@/components/shared";
import {
  formatPosition,
  formatToi,
  formatPercent,
  formatPer60,
} from "@/lib/formatters";
import type { Player, PlayerComparison, SkaterStats, Situation } from "@/types";

const searchSchema = z.object({
  ids: z.string().optional(),
  season: z.number().optional(),
  situation: z.string().optional(),
});

export const Route = createFileRoute("/compare")({
  component: ComparePage,
  validateSearch: searchSchema,
});

// Situation options
const SITUATIONS = [
  { value: "all", label: "All Situations" },
  { value: "5on5", label: "5v5" },
  { value: "5on4", label: "5v4 (Power Play)" },
  { value: "4on5", label: "4v5 (Penalty Kill)" },
] as const;

// Stats to compare
interface StatConfig {
  key: keyof SkaterStats | "pointsPerGame" | "goalsPer60" | "assistsPer60";
  label: string;
  format: (value: number | undefined | null, stats?: SkaterStats) => string;
  higherIsBetter: boolean;
}

const STAT_CONFIGS: StatConfig[] = [
  {
    key: "gamesPlayed",
    label: "GP",
    format: (v) => (v != null ? String(v) : "-"),
    higherIsBetter: true,
  },
  {
    key: "goals",
    label: "G",
    format: (v) => (v != null ? String(v) : "-"),
    higherIsBetter: true,
  },
  {
    key: "assists",
    label: "A",
    format: (v) => (v != null ? String(v) : "-"),
    higherIsBetter: true,
  },
  {
    key: "points",
    label: "P",
    format: (v) => (v != null ? String(v) : "-"),
    higherIsBetter: true,
  },
  {
    key: "pointsPerGame",
    label: "P/GP",
    format: (_, stats) =>
      stats && stats.gamesPlayed > 0
        ? (stats.points / stats.gamesPlayed).toFixed(2)
        : "-",
    higherIsBetter: true,
  },
  {
    key: "iceTimeSeconds",
    label: "TOI",
    format: (v) => (v != null ? formatToi(v) : "-"),
    higherIsBetter: true,
  },
  {
    key: "shots",
    label: "S",
    format: (v) => (v != null ? String(v) : "-"),
    higherIsBetter: true,
  },
  {
    key: "expectedGoals",
    label: "xG",
    format: (v) => (v != null ? v.toFixed(1) : "-"),
    higherIsBetter: true,
  },
  {
    key: "goalsPer60",
    label: "G/60",
    format: (_, stats) =>
      stats && stats.iceTimeSeconds > 0
        ? formatPer60(stats.goals, stats.iceTimeSeconds)
        : "-",
    higherIsBetter: true,
  },
  {
    key: "expectedGoalsPer60",
    label: "xG/60",
    format: (v) => (v != null ? v.toFixed(2) : "-"),
    higherIsBetter: true,
  },
  {
    key: "corsiForPct",
    label: "CF%",
    format: (v) => (v != null ? formatPercent(v, false) : "-"),
    higherIsBetter: true,
  },
  {
    key: "fenwickForPct",
    label: "FF%",
    format: (v) => (v != null ? formatPercent(v, false) : "-"),
    higherIsBetter: true,
  },
];

function ComparePage() {
  const { data: seasonsData } = useSeasons();
  const defaultSeason = seasonsData?.seasons?.[0]?.year;

  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  // Parse IDs from URL
  const selectedIds = useMemo(() => {
    if (!search.ids) return [];
    return search.ids
      .split(",")
      .map((id) => parseInt(id, 10))
      .filter((id) => !isNaN(id));
  }, [search.ids]);

  const season = search.season ?? defaultSeason;
  const situation = (search.situation as Situation) || "all";

  // Local state for player search
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Fetch comparison data
  const {
    data: comparisonData,
    isLoading,
    error,
    refetch,
  } = usePlayerComparison(selectedIds, season, situation);

  // Player search
  const { data: searchResults, isLoading: searchLoading } =
    usePlayerSearch(searchQuery, 1, 10);

  // Update URL params
  const updateSearch = (updates: {
    ids?: string;
    season?: number;
    situation?: Situation;
  }) => {
    navigate({
      search: (prev) => ({
        ...prev,
        ...updates,
      }),
    });
  };

  // Add player to comparison
  const addPlayer = (player: Player) => {
    if (selectedIds.length >= 5) return;
    if (selectedIds.includes(player.id)) return;

    const newIds = [...selectedIds, player.id];
    updateSearch({ ids: newIds.join(",") });
    setSearchQuery("");
    setShowSearch(false);
  };

  // Remove player from comparison
  const removePlayer = (playerId: number) => {
    const newIds = selectedIds.filter((id) => id !== playerId);
    updateSearch({ ids: newIds.length > 0 ? newIds.join(",") : undefined });
  };

  // Get stat value with highlighting
  const getStatValue = (
    config: StatConfig,
    player: PlayerComparison,
    allPlayers: PlayerComparison[]
  ) => {
    const stats = player.stats;
    let value: number | undefined | null;

    if (
      config.key === "pointsPerGame" ||
      config.key === "goalsPer60" ||
      config.key === "assistsPer60"
    ) {
      value = undefined; // Calculated in format function
    } else {
      value = stats?.[config.key as keyof SkaterStats] as
        | number
        | undefined
        | null;
    }

    const formatted = config.format(value, stats);

    // Find best value among all players
    const allValues = allPlayers
      .map((p) => {
        const s = p.stats;
        if (!s) return null;
        if (config.key === "pointsPerGame")
          return s.gamesPlayed > 0 ? s.points / s.gamesPlayed : null;
        if (config.key === "goalsPer60")
          return s.iceTimeSeconds > 0
            ? (s.goals / s.iceTimeSeconds) * 3600
            : null;
        if (config.key === "assistsPer60")
          return s.iceTimeSeconds > 0
            ? (s.assists / s.iceTimeSeconds) * 3600
            : null;
        return s[config.key as keyof SkaterStats] as number | null;
      })
      .filter((v): v is number => v != null);

    if (allValues.length === 0) {
      return { formatted, isBest: false, isWorst: false };
    }

    const best = config.higherIsBetter
      ? Math.max(...allValues)
      : Math.min(...allValues);
    const worst = config.higherIsBetter
      ? Math.min(...allValues)
      : Math.max(...allValues);

    let currentValue: number | null = null;
    if (stats) {
      if (config.key === "pointsPerGame")
        currentValue =
          stats.gamesPlayed > 0 ? stats.points / stats.gamesPlayed : null;
      else if (config.key === "goalsPer60")
        currentValue =
          stats.iceTimeSeconds > 0
            ? (stats.goals / stats.iceTimeSeconds) * 3600
            : null;
      else if (config.key === "assistsPer60")
        currentValue =
          stats.iceTimeSeconds > 0
            ? (stats.assists / stats.iceTimeSeconds) * 3600
            : null;
      else
        currentValue = stats[config.key as keyof SkaterStats] as number | null;
    }

    return {
      formatted,
      isBest: currentValue === best && allValues.length > 1,
      isWorst:
        currentValue === worst && allValues.length > 1 && best !== worst,
    };
  };

  // Filter search results to exclude already selected players
  const filteredSearchResults = searchResults?.players.filter(
    (p) => !selectedIds.includes(p.id)
  );

  return (
    <div className="container py-8">
      <BackButton />

      <div className="mb-6 mt-4">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Compare Players
        </h1>
        <p className="text-muted-foreground">
          Compare up to 5 players side-by-side with detailed stats.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <SeasonSelector
          value={season}
          onValueChange={(s) => updateSearch({ season: s })}
        />
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={situation}
            onValueChange={(s) => updateSearch({ situation: s as Situation })}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SITUATIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Selected Players */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <GitCompare className="h-5 w-5" />
            Selected Players ({selectedIds.length}/5)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            {comparisonData?.players.map((player) => (
              <Badge
                key={player.playerId}
                variant="secondary"
                className="py-1.5 px-3 text-sm"
              >
                {player.name}
                {player.team && (
                  <span className="text-muted-foreground ml-1">
                    ({player.team})
                  </span>
                )}
                <button
                  onClick={() => removePlayer(player.playerId)}
                  className="ml-2 hover:text-destructive"
                  aria-label={`Remove ${player.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}

            {selectedIds.length < 5 && (
              <div className="relative">
                {showSearch ? (
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Search players..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 w-48"
                        autoFocus
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowSearch(false);
                        setSearchQuery("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSearch(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Player
                  </Button>
                )}

                {/* Search Results Dropdown */}
                {showSearch && searchQuery.length >= 2 && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-popover border rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
                    {searchLoading ? (
                      <div className="p-4 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : filteredSearchResults &&
                      filteredSearchResults.length > 0 ? (
                      filteredSearchResults.map((player) => (
                        <button
                          key={player.id}
                          onClick={() => addPlayer(player)}
                          className="w-full px-3 py-2 text-left hover:bg-muted flex items-center justify-between"
                        >
                          <span>{player.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {player.position &&
                              formatPosition(player.position)}{" "}
                            {player.currentTeamAbbreviation &&
                              `• ${player.currentTeamAbbreviation}`}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        No players found
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedIds.length === 0 && (
            <p className="text-sm text-muted-foreground mt-3">
              Add at least 2 players to compare their statistics.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Error State */}
      {error && selectedIds.length >= 2 && (
        <ErrorState
          title="Comparison failed"
          message="Could not load player comparison data."
          onRetry={() => refetch()}
          variant="inline"
        />
      )}

      {/* Loading State */}
      {isLoading && selectedIds.length >= 2 && (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      )}

      {/* Comparison Table */}
      {!isLoading &&
        !error &&
        comparisonData &&
        comparisonData.players.length >= 2 && (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold sticky left-0 bg-muted/50 z-10">
                      Stat
                    </TableHead>
                    {comparisonData.players.map((player) => (
                      <TableHead
                        key={player.playerId}
                        className="text-center font-semibold min-w-30"
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span>{player.name}</span>
                          {player.position && (
                            <Badge
                              variant="outline"
                              className="text-xs font-normal"
                            >
                              {formatPosition(player.position)}
                            </Badge>
                          )}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {STAT_CONFIGS.map((config) => (
                    <TableRow key={config.key}>
                      <TableCell className="font-medium sticky left-0 bg-background z-10">
                        {config.label}
                      </TableCell>
                      {comparisonData.players.map((player) => {
                        const { formatted, isBest, isWorst } = getStatValue(
                          config,
                          player,
                          comparisonData.players
                        );
                        return (
                          <TableCell
                            key={player.playerId}
                            className={`text-center tabular-nums ${
                              isBest
                                ? "text-green-600 dark:text-green-400 font-semibold"
                                : isWorst
                                  ? "text-red-600 dark:text-red-400"
                                  : ""
                            }`}
                          >
                            {formatted}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

      {/* Empty State - Need More Players */}
      {selectedIds.length >= 1 && selectedIds.length < 2 && (
        <Card>
          <CardContent className="py-12 text-center">
            <GitCompare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="font-medium">Add one more player</p>
            <p className="text-sm text-muted-foreground mt-1">
              You need at least 2 players to compare.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      {comparisonData && comparisonData.players.length >= 2 && (
        <div className="flex items-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-green-600 dark:bg-green-400" />
            <span className="text-muted-foreground">Best in category</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-red-600 dark:bg-red-400" />
            <span className="text-muted-foreground">Worst in category</span>
          </div>
        </div>
      )}
    </div>
  );
}
