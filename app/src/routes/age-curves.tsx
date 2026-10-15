import { useState, useMemo, useEffect, useCallback } from "react";
import { PageHeader, SegmentedControl } from "@/components/layout";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as z from "zod/mini";
import { useAgeCurves, useAgeDistribution, usePageTitle, useSeriesColours } from "@/hooks";
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

const searchSchema = z.object({
  playerIds: z.optional(z.string()),
  metric: z.optional(z.string()),
  minGames: z.optional(z.number()),
  useMedian: z.optional(z.boolean()),
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
        leagueP25:
          ((point[`${metric}P25` as keyof typeof point] as number | null | undefined) ??
            null),
        leagueP75:
          ((point[`${metric}P75` as keyof typeof point] as number | null | undefined) ??
            null),
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

    const sorted = Array.from(ageMap.values()).sort(
      (a, b) => (a.age as number) - (b.age as number)
    ) as ChartDataPoint[];

    // Precompute band helpers for Recharts stacked-area technique
    for (const row of sorted) {
      const p25 = typeof row.leagueP25 === "number" ? row.leagueP25 : null;
      const p75 = typeof row.leagueP75 === "number" ? row.leagueP75 : null;
      if (p25 != null && p75 != null && p75 >= p25) {
        row.leagueBandBase = p25;
        row.leagueBandRange = p75 - p25;
      } else {
        row.leagueBandBase = null;
        row.leagueBandRange = null;
      }
    }

    return sorted;
  }, [data, metric]);

  const colourOf = useSeriesColours(selectedPlayerIds);

  // Map player IDs to names and colors
  const playerInfo: PlayerInfo[] = useMemo(() => {
    if (!data?.playerCurves) return [];
    return data.playerCurves
      .filter((curve) => selectedPlayerIds.includes(curve.playerId))
      .map((curve) => ({
        playerId: curve.playerId,
        playerName: curve.playerName,
        color: colourOf(curve.playerId),
        dataKey: `player_${curve.playerId}`,
      }));
  }, [data, selectedPlayerIds, colourOf]);

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
  const leagueLabel = useMedian ? "League median" : "League average";
  const chartTitle = useMemo(() => {
    if (playerInfo.length === 0) {
      return `${leagueLabel} ${selectedMetric.label} by age`;
    }
    if (playerInfo.length === 1) {
      return `${playerInfo[0].playerName} vs ${leagueLabel}`;
    }
    return `${selectedMetric.label} by age`;
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
    <div className="container space-y-6 py-8">
      <PageHeader
        title="Age curves"
        description="How production changes with age, and how individual players compare with the league at each age. Add up to five players."
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={metric}
          onValueChange={(v: string) => setMetric(v as MetricKey)}
        >
          <SelectTrigger className="w-36" aria-label="Metric">
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
        <Select
          value={String(minGames)}
          onValueChange={(v: string) => setMinGames(parseInt(v))}
        >
          <SelectTrigger className="w-32" aria-label="Minimum games">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10+ games</SelectItem>
            <SelectItem value="20">20+ games</SelectItem>
            <SelectItem value="40">40+ games</SelectItem>
            <SelectItem value="60">60+ games</SelectItem>
          </SelectContent>
        </Select>
        <SegmentedControl
          aria-label="League baseline"
          value={useMedian ? "median" : "average"}
          onValueChange={(v) => setUseMedian(v === "median")}
          options={[
            { value: "average", label: "League average" },
            { value: "median", label: "League median" },
          ]}
        />
        <PlayerSearchDropdown
          selectedPlayerIds={selectedPlayerIds}
          maxPlayers={5}
          onSelectPlayer={handleSelectPlayer}
          placeholder="Add a player"
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
        <Skeleton className="h-112 w-full rounded-2xl" />
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
