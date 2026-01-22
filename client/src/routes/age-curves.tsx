import { useState, useMemo, useEffect, useCallback } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { TrendingUp, Info, Search, X } from "lucide-react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { useAgeCurves, usePlayerSearch, useAgeDistribution } from "@/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared";
import { CHART_COLORS, CHART_AXIS_COLORS } from "@/lib/chart-colors";

const searchSchema = z.object({
  playerIds: z.string().optional(),
  metric: z.string().optional(),
  minGames: z.number().optional(),
  useMedian: z.boolean().optional(),
});

export const Route = createFileRoute("/age-curves")({
  component: AgeCurvesPage,
  validateSearch: searchSchema,
});

type MetricKey = "pointsPer60" | "goalsPer60" | "xgPer60";

const METRICS: { key: MetricKey; label: string }[] = [
  { key: "pointsPer60", label: "Points/60" },
  { key: "goalsPer60", label: "Goals/60" },
  { key: "xgPer60", label: "xG/60" },
];


function AgeCurvesPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const {
    playerIds: urlPlayerIds,
    metric: urlMetric,
    minGames: urlMinGames,
    useMedian: urlUseMedian,
  } = Route.useSearch();

  const [metric, setMetric] = useState<MetricKey>(
    (urlMetric as MetricKey) || "pointsPer60"
  );
  const [minGames, setMinGames] = useState(urlMinGames || 20);
  const [useMedian, setUseMedian] = useState(urlUseMedian || false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAge, setSelectedAge] = useState<number | null>(null);

  // Parse player IDs from URL
  const selectedPlayerIds = useMemo(() => {
    if (!urlPlayerIds) return [];
    return urlPlayerIds
      .split(",")
      .map((id: string) => parseInt(id.trim(), 10))
      .filter((id: number) => !isNaN(id));
  }, [urlPlayerIds]);

  const { data, isLoading, error, refetch } = useAgeCurves(
    minGames,
    selectedPlayerIds.length > 0 ? selectedPlayerIds : undefined,
    useMedian
  );
  const { data: searchResults } = usePlayerSearch(searchQuery, 1, 10);
  const { data: distributionData, isLoading: isLoadingDistribution } =
    useAgeDistribution(selectedAge, minGames);

  // Update URL when metric, minGames, or useMedian changes
  useEffect(() => {
    navigate({
      search: (prev) => ({
        ...prev,
        metric: metric !== "pointsPer60" ? metric : undefined,
        minGames: minGames !== 20 ? minGames : undefined,
        useMedian: useMedian ? true : undefined,
      }),
      replace: true,
    });
  }, [metric, minGames, useMedian, navigate]);

  // Build chart data with dynamic player columns
  const chartData = useMemo(() => {
    if (!data) return [];

    // Create a map of age -> data point
    const ageMap = new Map<number, Record<string, number | null>>();

    // Add league data
    for (const point of data.leagueCurve) {
      ageMap.set(point.age, {
        age: point.age,
        league: point[metric],
        leagueSample: point.sampleSize,
      });
    }

    // Add each player's data
    const playerCurves = data.playerCurves ?? [];
    for (const playerCurve of playerCurves) {
      for (const point of playerCurve.dataPoints) {
        const existing = ageMap.get(point.age) ?? {
          age: point.age,
          league: null,
          leagueSample: 0,
        };
        existing[`player_${playerCurve.playerId}`] = point[metric];
        ageMap.set(point.age, existing);
      }
    }

    return Array.from(ageMap.values()).sort(
      (a, b) => (a.age as number) - (b.age as number)
    );
  }, [data, metric]);

  // Map player IDs to names and colors (filtered by selected IDs to handle removal before refetch)
  const playerInfo = useMemo(() => {
    if (!data?.playerCurves) return [];
    return data.playerCurves
      .filter((curve) => selectedPlayerIds.includes(curve.playerId))
      .map((curve, index) => ({
        playerId: curve.playerId,
        playerName: curve.playerName,
        color: CHART_COLORS[index % CHART_COLORS.length],
        dataKey: `player_${curve.playerId}`,
      }));
  }, [data, selectedPlayerIds]);

  const handleSelectPlayer = (playerId: number) => {
    setSearchQuery("");
    // Add player to list (max 5)
    if (selectedPlayerIds.includes(playerId)) return;
    if (selectedPlayerIds.length >= 5) return;

    const newIds = [...selectedPlayerIds, playerId];
    navigate({
      search: (prev) => ({
        ...prev,
        playerIds: newIds.join(","),
      }),
    });
  };

  const handleRemovePlayer = (playerId: number) => {
    const newIds = selectedPlayerIds.filter((id) => id !== playerId);
    navigate({
      search: (prev) => ({
        ...prev,
        playerIds: newIds.length > 0 ? newIds.join(",") : undefined,
      }),
    });
  };

  const handleClearAllPlayers = () => {
    navigate({
      search: (prev) => ({
        ...prev,
        playerIds: undefined,
      }),
    });
  };

  const selectedMetric = METRICS.find((m) => m.key === metric)!;

  // Build chart title
  const leagueLabel = useMedian ? "League Median" : "League Average";
  const chartTitle = useMemo(() => {
    if (playerInfo.length === 0) {
      return `${leagueLabel} ${selectedMetric.label} by Age`;
    }
    if (playerInfo.length === 1) {
      return `${playerInfo[0].playerName} vs ${leagueLabel}`;
    }
    return `Player Comparison: ${selectedMetric.label} by Age`;
  }, [playerInfo, selectedMetric, leagueLabel]);

  // Build histogram data from distribution
  const histogramData = useMemo(() => {
    if (!distributionData?.dataPoints) return [];
    const values = distributionData.dataPoints.map(
      (d: { pointsPer60: number; goalsPer60: number; xgPer60: number }) =>
        d[metric]
    );
    if (values.length === 0) return [];

    const min = Math.floor(Math.min(...values));
    const max = Math.ceil(Math.max(...values));
    const binCount = 15;
    const binWidth = (max - min) / binCount || 1;

    const bins: { range: string; count: number; min: number; max: number }[] =
      [];
    for (let i = 0; i < binCount; i++) {
      const binMin = min + i * binWidth;
      const binMax = min + (i + 1) * binWidth;
      bins.push({
        range: `${binMin.toFixed(1)}-${binMax.toFixed(1)}`,
        count: 0,
        min: binMin,
        max: binMax,
      });
    }

    for (const value of values) {
      const binIndex = Math.min(
        Math.floor((value - min) / binWidth),
        binCount - 1
      );
      if (binIndex >= 0 && binIndex < bins.length) {
        bins[binIndex].count++;
      }
    }

    return bins;
  }, [distributionData, metric]);

  // Handle chart click to show distribution
  const handleChartClick = useCallback(
    (e: { activeLabel?: string | number }) => {
      if (e.activeLabel !== undefined) {
        const age =
          typeof e.activeLabel === "string"
            ? parseInt(e.activeLabel, 10)
            : e.activeLabel;
        if (!isNaN(age) && age >= 18 && age <= 45) {
          setSelectedAge(age);
        }
      }
    },
    []
  );

  return (
    <div className="container py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Age Curves</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl">
          Compare player performance trajectories against league averages by
          age. See how production typically changes as players progress through
          their careers.
        </p>
      </div>

      <Card className="mb-6 py-3 px-4">
        <div className="flex items-start gap-3">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            Age curves show how player performance typically changes over time.
            The league {useMedian ? "median" : "average"} line represents the{" "}
            {useMedian ? "median" : "mean"} production at each age across all
            qualifying seasons. Comparing individual players against this
            baseline can help identify early bloomers, late developers, or
            players aging gracefully. You can compare up to 5 players at once.
          </p>
        </div>
      </Card>

      <div className="flex flex-wrap items-start gap-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Metric:</span>
          <Select
            value={metric}
            onValueChange={(v: string) => setMetric(v as MetricKey)}
          >
            <SelectTrigger className="w-32 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METRICS.map((m) => (
                <SelectItem key={m.key} value={m.key}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Min Games:</span>
          <Select
            value={String(minGames)}
            onValueChange={(v: string) => setMinGames(parseInt(v))}
          >
            <SelectTrigger className="w-20 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10+</SelectItem>
              <SelectItem value="20">20+</SelectItem>
              <SelectItem value="40">40+</SelectItem>
              <SelectItem value="60">60+</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Baseline:</span>
          <Select
            value={useMedian ? "median" : "average"}
            onValueChange={(v: string) => setUseMedian(v === "median")}
          >
            <SelectTrigger className="w-28 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="average">Average</SelectItem>
              <SelectItem value="median">Median</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[200px] max-w-md relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={
                selectedPlayerIds.length >= 5
                  ? "Max 5 players"
                  : "Add player to compare..."
              }
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearchQuery(e.target.value)
              }
              className="pl-9 h-9"
              disabled={selectedPlayerIds.length >= 5}
            />
          </div>
          {searchQuery.length >= 2 &&
            searchResults?.players &&
            searchResults.players.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                {searchResults.players
                  .filter((player) => !selectedPlayerIds.includes(player.id))
                  .map((player) => (
                    <button
                      key={player.id}
                      onClick={() => handleSelectPlayer(player.id)}
                      className="w-full px-3 py-2 text-left hover:bg-muted text-sm flex justify-between items-center"
                    >
                      <span>{player.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {player.currentTeamAbbreviation}
                      </span>
                    </button>
                  ))}
              </div>
            )}
        </div>
      </div>

      {playerInfo.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {playerInfo.map((player) => (
            <Badge
              key={player.playerId}
              variant="secondary"
              className="gap-1 pl-2"
              style={{ borderLeftColor: player.color, borderLeftWidth: 3 }}
            >
              <Link
                to="/players/$id"
                params={{ id: String(player.playerId) }}
                className="hover:underline"
              >
                {player.playerName}
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent ml-1"
                onClick={() => handleRemovePlayer(player.playerId)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
          {playerInfo.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={handleClearAllPlayers}
            >
              Clear all
            </Button>
          )}
        </div>
      )}

      {error && (
        <ErrorState
          title="Failed to load age curves"
          message="Could not fetch age curve data. Please try again."
          onRetry={() => refetch()}
        />
      )}

      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
      ) : data ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{chartTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 10, right: 50, left: 0, bottom: 0 }}
                  onClick={handleChartClick}
                  style={{ cursor: "pointer" }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={CHART_AXIS_COLORS.grid}
                    strokeOpacity={CHART_AXIS_COLORS.gridOpacity}
                  />
                  <XAxis
                    dataKey="age"
                    tick={{ fill: CHART_AXIS_COLORS.tick, fontSize: 12 }}
                    tickFormatter={(v: number) => `${v}`}
                    label={{
                      value: "Age",
                      position: "insideBottom",
                      offset: -5,
                      fontSize: 12,
                      fill: CHART_AXIS_COLORS.tick,
                    }}
                    stroke={CHART_AXIS_COLORS.grid}
                    strokeOpacity={CHART_AXIS_COLORS.gridOpacity}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fill: CHART_AXIS_COLORS.tick, fontSize: 12 }}
                    width={45}
                    tickFormatter={(v: number) => v.toFixed(1)}
                    stroke={CHART_AXIS_COLORS.grid}
                    strokeOpacity={CHART_AXIS_COLORS.gridOpacity}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: CHART_AXIS_COLORS.tick, fontSize: 10 }}
                    width={35}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                    }
                    stroke={CHART_AXIS_COLORS.grid}
                    strokeOpacity={CHART_AXIS_COLORS.gridOpacity}
                    domain={[0, "auto"]}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      // Filter out sample size from main display
                      const metricPayload = payload.filter(
                        (p: { dataKey?: string }) =>
                          p.dataKey !== "leagueSample"
                      );
                      return (
                        <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
                          <p className="font-semibold mb-2">Age {label}</p>
                          {metricPayload.map(
                            (p: {
                              dataKey?: string;
                              color?: string;
                              name?: string;
                              value?: number;
                              payload?: Record<string, number>;
                            }) => (
                              <div
                                key={p.dataKey}
                                className="flex justify-between gap-4"
                              >
                                <span style={{ color: p.color }}>
                                  {p.name}:
                                </span>
                                <span className="font-medium">
                                  {typeof p.value === "number"
                                    ? p.value.toFixed(2)
                                    : "-"}
                                </span>
                              </div>
                            )
                          )}
                          {payload[0]?.payload?.leagueSample > 0 && (
                            <p className="text-xs text-muted-foreground mt-2 border-t pt-2">
                              Sample:{" "}
                              {payload[0].payload.leagueSample.toLocaleString()}{" "}
                              player-seasons
                            </p>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Legend />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="leagueSample"
                    name="Sample Size"
                    fill={CHART_AXIS_COLORS.reference}
                    stroke="none"
                    fillOpacity={0.1}
                    legendType="none"
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="league"
                    name={useMedian ? "League Median" : "League Average"}
                    stroke={CHART_AXIS_COLORS.reference}
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="5 5"
                  />
                  {playerInfo.map(
                    (player: {
                      playerId: number;
                      playerName: string;
                      color: string;
                      dataKey: string;
                    }) => (
                      <Line
                        yAxisId="left"
                        key={player.playerId}
                        type="monotone"
                        dataKey={player.dataKey}
                        name={player.playerName}
                        stroke={player.color}
                        strokeWidth={2}
                        dot={{ fill: player.color, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    )
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              League {useMedian ? "medians" : "averages"} based on all
              qualifying seasons (min {minGames} games played). The subtle
              shading shows sample size — note the drop after age 35.
              {playerInfo.length > 0 &&
                " Player data points shown for each season played."}{" "}
              Click on any age to see the distribution.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Dialog
        open={selectedAge !== null}
        onOpenChange={(open: boolean) => !open && setSelectedAge(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedMetric.label} Distribution at Age {selectedAge}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {isLoadingDistribution ? (
              <Skeleton className="h-64 w-full" />
            ) : histogramData.length > 0 ? (
              <>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={histogramData}
                      margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={CHART_AXIS_COLORS.grid}
                        strokeOpacity={CHART_AXIS_COLORS.gridOpacity}
                      />
                      <XAxis
                        dataKey="range"
                        tick={{ fill: CHART_AXIS_COLORS.tick, fontSize: 10 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        interval={1}
                        stroke={CHART_AXIS_COLORS.grid}
                        strokeOpacity={CHART_AXIS_COLORS.gridOpacity}
                      />
                      <YAxis
                        tick={{ fill: CHART_AXIS_COLORS.tick, fontSize: 12 }}
                        width={40}
                        label={{
                          value: "Players",
                          angle: -90,
                          position: "insideLeft",
                          fontSize: 12,
                          fill: CHART_AXIS_COLORS.tick,
                        }}
                        stroke={CHART_AXIS_COLORS.grid}
                        strokeOpacity={CHART_AXIS_COLORS.gridOpacity}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const data = payload[0].payload as {
                            range: string;
                            count: number;
                          };
                          return (
                            <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-2 text-sm">
                              <p className="font-medium">
                                {selectedMetric.label}: {data.range}
                              </p>
                              <p className="text-muted-foreground">
                                {data.count} player-seasons
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Bar
                        dataKey="count"
                        fill={CHART_COLORS[0]}
                        radius={[2, 2, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-muted-foreground mt-4 text-center">
                  Distribution of{" "}
                  {distributionData?.dataPoints.length.toLocaleString()}{" "}
                  player-seasons at age {selectedAge}. This shows why older ages
                  can have misleading averages — only elite players remain in
                  the league.
                </p>
              </>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No data available for age {selectedAge}.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
