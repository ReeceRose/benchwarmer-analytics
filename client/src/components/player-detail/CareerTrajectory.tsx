import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatSeason } from "@/lib/formatters";
import { CHART_COLORS, CHART_AXIS_COLORS } from "@/lib/chart-colors";
import type { SkaterStats } from "@/types";

interface CareerTrajectoryProps {
  stats: SkaterStats[];
}

type MetricKey = "pointsPer60" | "goalsPer60" | "assistsPer60" | "xgPer60" | "corsiPct";

interface DataPoint {
  season: number;
  seasonLabel: string;
  gamesPlayed: number;
  rawValue: number;
  value: number | null; // null for seasons with too little ice time
}

const METRICS: { key: MetricKey; label: string; description: string; format: (v: number) => string }[] = [
  {
    key: "pointsPer60",
    label: "Points/60",
    description: "Points per 60 minutes of ice time",
    format: (v) => v.toFixed(2),
  },
  {
    key: "goalsPer60",
    label: "Goals/60",
    description: "Goals per 60 minutes of ice time",
    format: (v) => v.toFixed(2),
  },
  {
    key: "assistsPer60",
    label: "Assists/60",
    description: "Assists per 60 minutes of ice time",
    format: (v) => v.toFixed(2),
  },
  {
    key: "xgPer60",
    label: "xG/60",
    description: "Expected Goals per 60 minutes",
    format: (v) => v.toFixed(2),
  },
  {
    key: "corsiPct",
    label: "CF%",
    description: "Corsi For Percentage (shot attempt share)",
    format: (v) => v.toFixed(1) + "%",
  },
];

const MIN_GAMES_FOR_FULL_SEASON = 20;

export function CareerTrajectory({ stats }: CareerTrajectoryProps) {
  const [metric, setMetric] = useState<MetricKey>("pointsPer60");

  // Process stats into trajectory data
  const trajectoryData = useMemo(() => {
    // Group by season, aggregate all situations for "all" stats
    const seasonMap = new Map<number, {
      gamesPlayed: number;
      iceTime: number;
      goals: number;
      assists: number;
      xg: number;
      corsiPct: number | null;
      corsiWeight: number;
    }>();

    // Only use regular season "all" situation stats
    const regularSeasonStats = stats.filter((s) => !s.isPlayoffs && s.situation === "all");

    for (const stat of regularSeasonStats) {
      const existing = seasonMap.get(stat.season);
      if (existing) {
        // Aggregate (player may have played for multiple teams)
        existing.gamesPlayed += stat.gamesPlayed;
        existing.iceTime += stat.iceTimeSeconds;
        existing.goals += stat.goals;
        existing.assists += stat.assists;
        existing.xg += stat.expectedGoals ?? 0;
        if (stat.corsiForPct != null) {
          existing.corsiPct = (
            (existing.corsiPct ?? 0) * existing.corsiWeight + stat.corsiForPct * stat.iceTimeSeconds
          ) / (existing.corsiWeight + stat.iceTimeSeconds);
          existing.corsiWeight += stat.iceTimeSeconds;
        }
      } else {
        seasonMap.set(stat.season, {
          gamesPlayed: stat.gamesPlayed,
          iceTime: stat.iceTimeSeconds,
          goals: stat.goals,
          assists: stat.assists,
          xg: stat.expectedGoals ?? 0,
          corsiPct: stat.corsiForPct ?? null,
          corsiWeight: stat.corsiForPct != null ? stat.iceTimeSeconds : 0,
        });
      }
    }

    // Convert to data points
    const data: DataPoint[] = [];
    const sortedSeasons = Array.from(seasonMap.keys()).sort((a, b) => a - b);

    for (const season of sortedSeasons) {
      const s = seasonMap.get(season)!;
      const hours = s.iceTime / 3600;

      // Calculate per-60 rates (need at least 1 hour of ice time)
      let rawValue = 0;
      let value: number | null = null;

      switch (metric) {
        case "pointsPer60":
          // hours is in hours, so points/hours = points per hour = points per 60 minutes
          rawValue = hours > 0 ? (s.goals + s.assists) / hours : 0;
          break;
        case "goalsPer60":
          rawValue = hours > 0 ? s.goals / hours : 0;
          break;
        case "assistsPer60":
          rawValue = hours > 0 ? s.assists / hours : 0;
          break;
        case "xgPer60":
          rawValue = hours > 0 ? s.xg / hours : 0;
          break;
        case "corsiPct":
          // corsiPct is stored as whole number (57 for 57%)
          rawValue = s.corsiPct ?? 50;
          break;
      }

      // Only show value if they played enough games
      if (s.gamesPlayed >= MIN_GAMES_FOR_FULL_SEASON) {
        value = rawValue;
      }

      data.push({
        season,
        seasonLabel: formatSeason(season),
        gamesPlayed: s.gamesPlayed,
        rawValue,
        value,
      });
    }

    return data;
  }, [stats, metric]);

  // Calculate league average for reference line (approximation)
  const leagueAverage = useMemo(() => {
    switch (metric) {
      case "pointsPer60":
        return 2.0;
      case "goalsPer60":
        return 0.8;
      case "assistsPer60":
        return 1.2;
      case "xgPer60":
        return 0.7;
      case "corsiPct":
        return 50;
    }
  }, [metric]);

  const selectedMetric = METRICS.find((m) => m.key === metric)!;

  // Calculate domain for Y axis
  const validValues = trajectoryData.filter((d) => d.value != null).map((d) => d.value!);
  const minValue = validValues.length > 0 ? Math.min(...validValues, leagueAverage) : 0;
  const maxValue = validValues.length > 0 ? Math.max(...validValues, leagueAverage) : 10;
  const padding = (maxValue - minValue) * 0.1;

  if (trajectoryData.length < 2) {
    return null;
  }

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">Career Trajectory</CardTitle>
        <Select value={metric} onValueChange={(v) => setMetric(v as MetricKey)}>
          <SelectTrigger className="w-32 h-8 text-sm">
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
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={trajectoryData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_AXIS_COLORS.grid} strokeOpacity={CHART_AXIS_COLORS.gridOpacity} />
              <XAxis
                dataKey="seasonLabel"
                tick={{ fill: CHART_AXIS_COLORS.tick, fontSize: 12 }}
                stroke={CHART_AXIS_COLORS.grid}
                strokeOpacity={CHART_AXIS_COLORS.gridOpacity}
              />
              <YAxis
                domain={[minValue - padding, maxValue + padding]}
                tick={{ fill: CHART_AXIS_COLORS.tick, fontSize: 12 }}
                width={55}
                tickFormatter={(v) => typeof v === "number" ? v.toFixed(1) : v}
                stroke={CHART_AXIS_COLORS.grid}
                strokeOpacity={CHART_AXIS_COLORS.gridOpacity}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload as DataPoint;
                  return (
                    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
                      <p className="font-semibold">{data.seasonLabel}</p>
                      <p className="text-muted-foreground">{data.gamesPlayed} GP</p>
                      <p className="mt-1">
                        {selectedMetric.label}:{" "}
                        <span className="font-medium">
                          {data.value != null
                            ? selectedMetric.format(data.value)
                            : "N/A (too few games)"}
                        </span>
                      </p>
                    </div>
                  );
                }}
              />
              <ReferenceLine
                y={leagueAverage}
                stroke={CHART_AXIS_COLORS.reference}
                strokeDasharray="5 5"
                label={{
                  value: "League Avg",
                  position: "right",
                  fontSize: 10,
                  fill: CHART_AXIS_COLORS.reference,
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={CHART_COLORS[0]}
                strokeWidth={2}
                dot={{ fill: CHART_COLORS[0], r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {selectedMetric.description}. Seasons with fewer than {MIN_GAMES_FOR_FULL_SEASON} games are not shown.
        </p>
      </CardContent>
    </Card>
  );
}
