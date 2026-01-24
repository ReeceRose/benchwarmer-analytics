import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatSeason } from "@/lib/formatters";
import { CHART_COLORS_CSS, CHART_AXIS_COLORS } from "@/lib/chart-colors";

interface SeasonData {
  season: number;
  [key: string]: number | string | null;
}

interface MetricConfig {
  key: string;
  label: string;
  color?: string;
  format?: (value: number) => string;
}

interface PerformanceTrendProps {
  data: SeasonData[];
  metrics: MetricConfig[];
  title?: string;
  className?: string;
}

// Tooltip props interface for PerformanceTrend
interface TrendTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
  }>;
  label?: number;
  metrics: MetricConfig[];
}

// Custom tooltip component for performance trend chart
function TrendChartTooltip({ active, payload, label, metrics }: TrendTooltipProps) {
  if (!active || !payload?.length || label == null) return null;

  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold mb-2">{formatSeason(label)}</p>
      <div className="space-y-1">
        {payload.map((entry, i) => {
          const metricConfig = metrics.find((m) => m.key === entry.dataKey);
          const formatted = metricConfig?.format
            ? metricConfig.format(entry.value)
            : entry.value.toFixed(1);

          return (
            <div key={i} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span>{metricConfig?.label ?? entry.name}:</span>
              <span className="font-mono ml-auto">{formatted}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PerformanceTrend({
  data,
  metrics,
  title = "Performance Trend",
  className,
}: PerformanceTrendProps) {
  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No trend data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort by season ascending for proper chart display
  const sortedData = [...data].sort((a, b) => a.season - b.season);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={sortedData}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_AXIS_COLORS.grid} strokeOpacity={CHART_AXIS_COLORS.gridOpacity} />
            <XAxis
              dataKey="season"
              tickFormatter={(v: number) => formatSeason(v)}
              tick={{ fill: CHART_AXIS_COLORS.tick, fontSize: 11 }}
              axisLine={{ stroke: CHART_AXIS_COLORS.grid, strokeOpacity: CHART_AXIS_COLORS.gridOpacity }}
            />
            <YAxis
              tick={{ fill: CHART_AXIS_COLORS.tick, fontSize: 11 }}
              axisLine={{ stroke: CHART_AXIS_COLORS.grid, strokeOpacity: CHART_AXIS_COLORS.gridOpacity }}
              width={40}
            />
            <Tooltip content={<TrendChartTooltip metrics={metrics} />} wrapperStyle={{ outline: 'none', background: 'transparent', border: 'none' }} />
            {metrics.length > 1 && (
              <Legend
                wrapperStyle={{ fontSize: "12px" }}
                formatter={(value: string) => {
                  const metric = metrics.find((m) => m.key === value);
                  return (
                    <span className="text-foreground">
                      {metric?.label ?? value}
                    </span>
                  );
                }}
              />
            )}
            {metrics.map((metric, i) => (
              <Line
                key={metric.key}
                type="monotone"
                dataKey={metric.key}
                name={metric.label}
                stroke={metric.color ?? CHART_COLORS_CSS[i % CHART_COLORS_CSS.length]}
                strokeWidth={2}
                dot={{ r: 4, fill: metric.color ?? CHART_COLORS_CSS[i % CHART_COLORS_CSS.length] }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
