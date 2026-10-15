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
import { SegmentedControl } from "@/components/layout";
import { ChartLegend } from "@/components/charts/ChartLegend";
import { formatSeason } from "@/lib/formatters";
import { TREND_METRICS, type TrendMetric } from "@/components/league-trends/trend-metrics";
import { CHART_COLOURS, CHART_AXIS_COLOURS } from "@/lib/chart-colours";
import type { SeasonTrend } from "@/types";

interface LeagueTrendsChartProps {
  data: SeasonTrend[];
  metric: TrendMetric;
  onMetricChange: (metric: TrendMetric) => void;
  /** The last season is still being played: draw it hollow, joined by a dashed line. */
  lastInProgress: boolean;
}

const COLOUR = CHART_COLOURS[0];

interface Point {
  seasonLabel: string;
  value: number;
  complete: number | null;
  partial: number | null;
  inProgress: boolean;
}

function TrendDot(props: { cx?: number; cy?: number; payload?: Point }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload) return null;
  return payload.inProgress ? (
    <circle cx={cx} cy={cy} r={4} fill="var(--card)" stroke={COLOUR} strokeWidth={2} />
  ) : (
    <circle cx={cx} cy={cy} r={3} fill={COLOUR} />
  );
}

/** One league-wide measure per season, with a switch between measures. */
export function LeagueTrendsChart({ data, metric, onMetricChange, lastInProgress }: LeagueTrendsChartProps) {
  const config = TREND_METRICS[metric];
  const last = data.length - 1;

  const chartData: Point[] = data.map((d, i) => {
    const inProgress = lastInProgress && i === last;
    return {
      seasonLabel: formatSeason(d.season),
      value: d[metric],
      complete: inProgress ? null : d[metric],
      partial: lastInProgress && i >= last - 1 ? d[metric] : null,
      inProgress,
    };
  });

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-3 pb-2">
        <CardTitle className="text-base">{config.label}</CardTitle>
        <div className="max-w-full overflow-x-auto">
          <SegmentedControl
            aria-label="Measure"
            value={metric}
            onValueChange={onMetricChange}
            options={(Object.keys(TREND_METRICS) as TrendMetric[]).map((m) => ({
              value: m,
              label: TREND_METRICS[m].short,
            }))}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-75">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                stroke={CHART_AXIS_COLOURS.grid}
                strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
              />
              <XAxis
                dataKey="seasonLabel"
                tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: CHART_AXIS_COLOURS.grid }}
                interval="preserveStartEnd"
                minTickGap={16}
              />
              <YAxis
                domain={config.domain ?? ["auto", "auto"]}
                tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={52}
                tickFormatter={config.format}
              />
              <Tooltip
                cursor={{ stroke: CHART_AXIS_COLOURS.grid }}
                content={({ active, payload, label }) => {
                  const point = payload?.[0]?.payload as Point | undefined;
                  if (!active || !point) return null;
                  return (
                    <div className="rounded-xl border bg-popover p-3 text-sm text-popover-foreground shadow-lg shadow-black/5">
                      <p className="font-semibold">
                        {label}
                        {point.inProgress && <span className="font-normal text-muted-foreground"> so far</span>}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {config.short}:{" "}
                        <span className="font-medium text-foreground tabular-nums">{config.format(point.value)}</span>
                      </p>
                    </div>
                  );
                }}
              />
              <Line
                type="linear"
                dataKey="complete"
                stroke={COLOUR}
                strokeWidth={2}
                dot={<TrendDot />}
                activeDot={{ r: 5, fill: COLOUR, stroke: "var(--card)", strokeWidth: 2 }}
                connectNulls={false}
                isAnimationActive={false}
              />
              {lastInProgress && (
                <Line
                  type="linear"
                  dataKey="partial"
                  stroke={COLOUR}
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={<TrendDot />}
                  activeDot={false}
                  isAnimationActive={false}
                  tooltipType="none"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        {lastInProgress && (
          <ChartLegend
            className="mt-3"
            items={[
              { label: "Full season", colour: COLOUR },
              { label: `${chartData[last].seasonLabel} so far`, colour: COLOUR, dashed: true },
            ]}
          />
        )}
      </CardContent>
    </Card>
  );
}
