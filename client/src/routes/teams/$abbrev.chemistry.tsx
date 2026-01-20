import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Grid3X3, Filter, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BackButton, SeasonSelector, ErrorState } from "@/components/shared";
import { useChemistryMatrix, useTeamSeasons, useTeam } from "@/hooks";
import { formatToi, formatPercent } from "@/lib/formatters";
import type { ChemistryPair, Situation, PositionFilter } from "@/types";

const searchSchema = z.object({
  season: z.number().optional(),
  situation: z.string().optional(),
  position: z.enum(["all", "forward", "defense"]).optional(),
});

export const Route = createFileRoute("/teams/$abbrev/chemistry")({
  component: TeamChemistryPage,
  validateSearch: searchSchema,
});

// Situation options
const SITUATIONS = [
  { value: "5on5", label: "5v5" },
  { value: "all", label: "All Situations" },
  { value: "5on4", label: "5v4 (PP)" },
  { value: "4on5", label: "4v5 (PK)" },
] as const;

// Position filter options
const POSITION_FILTERS = [
  { value: "all", label: "All Players" },
  { value: "forward", label: "Forwards Only" },
  { value: "defense", label: "Defense Only" },
] as const;


// Color scale for xG% (50% is neutral)
function getHeatColor(xgPct: number | undefined | null, hasData: boolean): string {
  // No data - show empty/transparent cell
  if (!hasData || xgPct == null) return "transparent";

  // Clamp to 35-65 range for color scaling (tighter range for better contrast)
  const clamped = Math.max(35, Math.min(65, xgPct));
  const normalized = (clamped - 35) / 30; // 0 to 1

  // Red (bad) -> Yellow (neutral) -> Green (good)
  // Using HSL: 0 = red, 60 = yellow, 120 = green
  const hue = normalized * 120; // 0 to 120
  return `hsl(${hue}, 75%, 45%)`;
}

function TeamChemistryPage() {
  const { abbrev } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  // Get team info
  const { data: team } = useTeam(abbrev);

  // Get available seasons for this team
  const { data: seasonsData } = useTeamSeasons(abbrev);
  const defaultSeason = seasonsData?.seasons?.[0]?.year;

  // Derive state from URL
  const season = search.season ?? defaultSeason;
  const situation = (search.situation as Situation) || "5on5";
  const position = (search.position as PositionFilter) || "all";

  // Hovering state for tooltip
  const [hoveredPair, setHoveredPair] = useState<ChemistryPair | null>(null);

  // Fetch chemistry data - only pass position if not "all" to avoid unnecessary filtering
  const {
    data: chemistryData,
    isLoading,
    error,
    refetch,
  } = useChemistryMatrix(abbrev, {
    season: season!,
    situation,
    position: position === "all" ? undefined : position,
  });

  // Update URL params
  const updateSearch = (updates: {
    season?: number;
    situation?: Situation;
    position?: PositionFilter;
  }) => {
    navigate({
      search: (prev) => ({
        ...prev,
        ...updates,
      }),
    });
  };

  // Build matrix data from pairs
  const matrixData = useMemo(() => {
    if (!chemistryData?.pairs) return null;

    // Get unique players and build lookup
    const playerMap = new Map<number, { id: number; name: string }>();
    for (const pair of chemistryData.pairs) {
      playerMap.set(pair.player1Id, {
        id: pair.player1Id,
        name: pair.player1Name,
      });
      playerMap.set(pair.player2Id, {
        id: pair.player2Id,
        name: pair.player2Name,
      });
    }

    // Sort players by total ice time
    const playerToi = new Map<number, number>();
    for (const pair of chemistryData.pairs) {
      playerToi.set(
        pair.player1Id,
        (playerToi.get(pair.player1Id) ?? 0) + pair.totalIceTimeSeconds
      );
      playerToi.set(
        pair.player2Id,
        (playerToi.get(pair.player2Id) ?? 0) + pair.totalIceTimeSeconds
      );
    }

    const players = Array.from(playerMap.values()).sort(
      (a, b) => (playerToi.get(b.id) ?? 0) - (playerToi.get(a.id) ?? 0)
    );

    // Build pair lookup
    const pairLookup = new Map<string, ChemistryPair>();
    for (const pair of chemistryData.pairs) {
      const key1 = `${pair.player1Id}-${pair.player2Id}`;
      const key2 = `${pair.player2Id}-${pair.player1Id}`;
      pairLookup.set(key1, pair);
      pairLookup.set(key2, pair);
    }

    return { players, pairLookup };
  }, [chemistryData]);

  // Cell size for the matrix
  const cellSize = 32;
  const labelWidth = 130;
  const headerHeight = 80; // More space for rotated names

  return (
    <div className="container py-8">
      <BackButton
        fallbackPath={`/teams/${abbrev}`}
        label={team?.name || abbrev}
      />

      <div className="mb-6 mt-4">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Chemistry Matrix
        </h1>
        <p className="text-muted-foreground">
          Player pair performance measured by xG% when playing together.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <SeasonSelector
          value={season}
          onValueChange={(s) => updateSearch({ season: s })}
          teamAbbrev={abbrev}
        />
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={situation}
            onValueChange={(s) => updateSearch({ situation: s as Situation })}
          >
            <SelectTrigger className="w-32">
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
        <Select
          value={position}
          onValueChange={(p) => updateSearch({ position: p as PositionFilter })}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {POSITION_FILTERS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Error State */}
      {error && (
        <ErrorState
          title="Failed to load chemistry data"
          message="Could not fetch chemistry matrix. Please try again."
          onRetry={() => refetch()}
          variant="inline"
        />
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-125 w-full" />
        </div>
      )}

      {/* No Season Selected */}
      {!season && !isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="font-medium">Select a season to view chemistry data</p>
          </CardContent>
        </Card>
      )}

      {/* Chemistry Matrix */}
      {!isLoading && !error && matrixData && matrixData.players.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Grid3X3 className="h-5 w-5" />
              Player Pair xG%
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      Expected goals percentage when two players are on ice
                      together. Green indicates the pair generates more offense
                      than defense, red indicates the opposite.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {/* Legend */}
            <div className="flex items-center gap-4 mb-4 text-sm">
              <span className="text-muted-foreground">xG%:</span>
              <div className="flex items-center gap-1">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: getHeatColor(35, true) }}
                />
                <span>35%</span>
              </div>
              <div className="flex items-center gap-1">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: getHeatColor(50, true) }}
                />
                <span>50%</span>
              </div>
              <div className="flex items-center gap-1">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: getHeatColor(65, true) }}
                />
                <span>65%</span>
              </div>
              <div className="flex items-center gap-2 ml-4 border-l pl-4">
                <div className="w-4 h-4 rounded border border-dashed border-muted-foreground/50" />
                <span className="text-muted-foreground">No data</span>
              </div>
            </div>

            {/* Matrix SVG */}
            <div className="relative">
              <svg
                width={labelWidth + matrixData.players.length * cellSize + 10}
                height={headerHeight + matrixData.players.length * cellSize + 10}
                className="text-xs"
              >
                {/* Row Labels (left side) */}
                {matrixData.players.map((player, i) => (
                  <Link
                    key={`row-${player.id}`}
                    to="/players/$id"
                    params={{ id: String(player.id) }}
                  >
                    <text
                      x={labelWidth - 4}
                      y={headerHeight + i * cellSize + cellSize / 2 + 4}
                      textAnchor="end"
                      className="fill-foreground hover:fill-primary cursor-pointer text-[11px]"
                    >
                      {player.name.length > 16
                        ? player.name.slice(0, 14) + "..."
                        : player.name}
                    </text>
                  </Link>
                ))}

                {/* Column Labels (top, rotated) */}
                {matrixData.players.map((player, i) => {
                  const lastName = player.name.split(" ").pop() || player.name;
                  return (
                    <Link
                      key={`col-${player.id}`}
                      to="/players/$id"
                      params={{ id: String(player.id) }}
                    >
                      <text
                        x={labelWidth + i * cellSize + cellSize / 2}
                        y={headerHeight - 4}
                        textAnchor="start"
                        transform={`rotate(-55, ${labelWidth + i * cellSize + cellSize / 2}, ${headerHeight - 4})`}
                        className="fill-foreground hover:fill-primary cursor-pointer text-[10px]"
                      >
                        {lastName.length > 10 ? lastName.slice(0, 9) + "…" : lastName}
                      </text>
                    </Link>
                  );
                })}

                {/* Matrix Cells */}
                {matrixData.players.map((rowPlayer, i) =>
                  matrixData.players.map((colPlayer, j) => {
                    if (i === j) {
                      // Diagonal - self (grey)
                      return (
                        <rect
                          key={`cell-${i}-${j}`}
                          x={labelWidth + j * cellSize}
                          y={headerHeight + i * cellSize}
                          width={cellSize - 1}
                          height={cellSize - 1}
                          fill="hsl(0, 0%, 30%)"
                          rx={2}
                        />
                      );
                    }

                    const pair = matrixData.pairLookup.get(
                      `${rowPlayer.id}-${colPlayer.id}`
                    );
                    const xgPct = pair?.expectedGoalsPct
                      ? pair.expectedGoalsPct * 100
                      : null;
                    const hasData = pair != null;

                    return (
                      <g key={`cell-${i}-${j}`}>
                        {/* Background rect for empty cells */}
                        <rect
                          x={labelWidth + j * cellSize}
                          y={headerHeight + i * cellSize}
                          width={cellSize - 1}
                          height={cellSize - 1}
                          fill={hasData ? getHeatColor(xgPct, true) : "hsl(0, 0%, 15%)"}
                          stroke={hasData ? "none" : "hsl(0, 0%, 25%)"}
                          strokeWidth={hasData ? 0 : 1}
                          strokeDasharray={hasData ? "none" : "2,2"}
                          rx={2}
                          className={hasData ? "cursor-pointer transition-opacity hover:opacity-80" : ""}
                          onMouseEnter={() => hasData && setHoveredPair(pair || null)}
                          onMouseLeave={() => setHoveredPair(null)}
                        />
                        {xgPct != null && (
                          <text
                            x={labelWidth + j * cellSize + cellSize / 2}
                            y={headerHeight + i * cellSize + cellSize / 2 + 3}
                            textAnchor="middle"
                            className="fill-white text-[9px] font-medium pointer-events-none"
                            style={{ textShadow: "0 0 2px rgba(0,0,0,0.5)" }}
                          >
                            {xgPct.toFixed(0)}
                          </text>
                        )}
                      </g>
                    );
                  })
                )}
              </svg>

              {/* Hover Tooltip */}
              {hoveredPair && (
                <div className="absolute top-4 right-4 bg-popover border rounded-lg shadow-lg p-3 min-w-50 z-10">
                  <div className="font-medium mb-2">
                    {hoveredPair.player1Name} + {hoveredPair.player2Name}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-muted-foreground">xG%:</span>
                    <span className="font-mono">
                      {hoveredPair.expectedGoalsPct != null
                        ? formatPercent(hoveredPair.expectedGoalsPct)
                        : "-"}
                    </span>
                    <span className="text-muted-foreground">CF%:</span>
                    <span className="font-mono">
                      {hoveredPair.corsiPct != null
                        ? formatPercent(hoveredPair.corsiPct)
                        : "-"}
                    </span>
                    <span className="text-muted-foreground">TOI:</span>
                    <span className="font-mono">
                      {formatToi(hoveredPair.totalIceTimeSeconds)}
                    </span>
                    <span className="text-muted-foreground">GP:</span>
                    <span className="font-mono">{hoveredPair.gamesPlayed}</span>
                    <span className="text-muted-foreground">GF/GA:</span>
                    <span className="font-mono">
                      {hoveredPair.goalsFor}/{hoveredPair.goalsAgainst}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data */}
      {!isLoading &&
        !error &&
        season &&
        (!matrixData || matrixData.players.length === 0) && (
          <Card>
            <CardContent className="py-12 text-center">
              <Grid3X3 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="font-medium">No chemistry data available</p>
              <p className="text-sm text-muted-foreground mt-1">
                No player pair data found for this season and situation.
              </p>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
