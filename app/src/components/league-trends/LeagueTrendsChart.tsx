import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatSeason } from "@/lib/formatters";
import { CHART_COLOURS, CHART_AXIS_COLOURS } from "@/lib/chart-colours";
import type { SeasonTrend } from "@/types";

export type TrendMetric =
  | "avgGoalsPerGame"
  | "avgAssistsPerGame"
  | "avgToiPerGame"
  | "avgCorsiPct"
  | "avgXgPer60";

interface LeagueTrendsChartProps {
  data: SeasonTrend[];
  metric: TrendMetric;
}

const metricConfig: Record<
  TrendMetric,
  { label: string; format: (v: number) => string; domain?: [number, number] }
> = {
  avgGoalsPerGame: {
    label: "Goals per team-game",
    format: (v) => v.toFixed(2),
  },
  avgAssistsPerGame: {
    label: "Assists per team-game",
    format: (v) => v.toFixed(2),
  },
  avgToiPerGame: {
    label: "Average TOI per game",
    format: (v) => {
      const mins = Math.floor(v / 60);
      const secs = Math.round(v % 60);
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    },
  },
  avgCorsiPct: {
    label: "Average CF%",
    format: (v) => `${v.toFixed(1)}%`,
    domain: [45, 55],
  },
  avgXgPer60: {
    label: "xG per 60",
    format: (v) => v.toFixed(3),
  },
};

export function LeagueTrendsChart({ data, metric }: LeagueTrendsChartProps) {
  const config = metricConfig[metric];

  const chartData = data.map((d) => ({
    season: d.season,
    seasonLabel: formatSeason(d.season),
    value: d[metric],
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{config.label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-75">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
            >
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                stroke={CHART_AXIS_COLOURS.grid}
                strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
              />
              <XAxis
                dataKey="seasonLabel"
                tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: CHART_AXIS_COLOURS.grid }}
              />
              <YAxis
                domain={config.domain ?? ["auto", "auto"]}
                tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={config.format}
              />
              <Tooltip
                cursor={{ stroke: CHART_AXIS_COLOURS.grid }}
                content={({ active, payload, label }) => {
                  const value = payload?.[0]?.value;
                  if (!active || typeof value !== "number") return null;
                  return (
                    <div className="rounded-xl border bg-popover p-3 text-sm text-popover-foreground shadow-lg shadow-black/5">
                      <p className="font-semibold">{label}</p>
                      <p className="mt-1 text-muted-foreground">
                        {config.label}:{" "}
                        <span className="font-medium text-foreground tabular-nums">
                          {config.format(value)}
                        </span>
                      </p>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                name={config.label}
                stroke={CHART_COLOURS[0]}
                strokeWidth={2}
                dot={{ fill: CHART_COLOURS[0], strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, stroke: CHART_COLOURS[0], strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
