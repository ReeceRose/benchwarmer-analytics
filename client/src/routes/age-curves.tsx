import { useState, useMemo, useEffect, useCallback } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { TrendingUp, Info } from "lucide-react";
import { useAgeCurves, useAgeDistribution, usePageTitle } from "@/hooks";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, PlayerSearchDropdown } from "@/components/shared";
import {
  AgeCurvesChart,
  AgeDistributionDialog,
  SelectedPlayersBar,
} from "@/components/age-curves";
import type { PlayerInfo, ChartDataPoint } from "@/components/age-curves";
import { buildHistogramBins } from "@/lib/histogram";
import { CHART_COLOURS } from "@/lib/chart-colours";

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
  usePageTitle("Age Curves");

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
  const chartData: ChartDataPoint[] = useMemo(() => {
    if (!data) return [];

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
    ) as ChartDataPoint[];
  }, [data, metric]);

  // Map player IDs to names and colors
  const playerInfo: PlayerInfo[] = useMemo(() => {
    if (!data?.playerCurves) return [];
    return data.playerCurves
      .filter((curve) => selectedPlayerIds.includes(curve.playerId))
      .map((curve, index) => ({
        playerId: curve.playerId,
        playerName: curve.playerName,
        color: CHART_COLOURS[index % CHART_COLOURS.length],
        dataKey: `player_${curve.playerId}`,
      }));
  }, [data, selectedPlayerIds]);

  const handleSelectPlayer = useCallback(
    (playerId: number) => {
      if (selectedPlayerIds.includes(playerId)) return;
      if (selectedPlayerIds.length >= 5) return;

      const newIds = [...selectedPlayerIds, playerId];
      navigate({
        search: (prev) => ({
          ...prev,
          playerIds: newIds.join(","),
        }),
      });
    },
    [selectedPlayerIds, navigate]
  );

  const handleRemovePlayer = useCallback(
    (playerId: number) => {
      const newIds = selectedPlayerIds.filter((id) => id !== playerId);
      navigate({
        search: (prev) => ({
          ...prev,
          playerIds: newIds.length > 0 ? newIds.join(",") : undefined,
        }),
      });
    },
    [selectedPlayerIds, navigate]
  );

  const handleClearAllPlayers = useCallback(() => {
    navigate({
      search: (prev) => ({
        ...prev,
        playerIds: undefined,
      }),
    });
  }, [navigate]);

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
    return buildHistogramBins(values);
  }, [distributionData, metric]);

  const handleAgeClick = useCallback((age: number) => {
    setSelectedAge(age);
  }, []);

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

        <PlayerSearchDropdown
          selectedPlayerIds={selectedPlayerIds}
          maxPlayers={5}
          onSelectPlayer={handleSelectPlayer}
          placeholder="Add player to compare..."
        />
      </div>

      <SelectedPlayersBar
        players={playerInfo}
        onRemovePlayer={handleRemovePlayer}
        onClearAll={handleClearAllPlayers}
      />

      {error && (
        <ErrorState
          title="Failed to load age curves"
          message="Could not fetch age curve data. Please try again."
          onRetry={() => refetch()}
        />
      )}

      {isLoading ? (
        <Card className="p-6">
          <Skeleton className="h-80 w-full" />
        </Card>
      ) : data ? (
        <AgeCurvesChart
          chartData={chartData}
          playerInfo={playerInfo}
          title={chartTitle}
          useMedian={useMedian}
          minGames={minGames}
          onAgeClick={handleAgeClick}
        />
      ) : null}

      <AgeDistributionDialog
        open={selectedAge !== null}
        onOpenChange={(open) => !open && setSelectedAge(null)}
        selectedAge={selectedAge}
        metricLabel={selectedMetric.label}
        histogramData={histogramData}
        totalDataPoints={distributionData?.dataPoints?.length ?? 0}
        isLoading={isLoadingDistribution}
      />
    </div>
  );
}
