import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { CHART_AXIS_COLOURS, SEMANTIC_COLOURS } from "@/lib/chart-colours";
import { formatToi } from "@/lib/formatters";
import { getLineLabel } from "@/components/line-explorer/charts/line-chart-utils";
import { LineTooltipWrapper } from "@/components/line-explorer/charts/LineTooltipWrapper";
import type { LineCombination } from "@/types";

interface LineEffectivenessChartProps {
  lines: LineCombination[];
  isForwardLine: boolean;
}

interface ChartDataPoint {
  id: number;
  label: string;
  xgPct: number;
  toi: number;
  toiFormatted: string;
  gf: number;
  ga: number;
  isGood: boolean;
}

export function LineEffectivenessChart({
  lines,
  isForwardLine,
}: LineEffectivenessChartProps) {
  const chartData = useMemo(() => {
    return lines
      .filter((line) => line.expectedGoalsPct != null)
      .slice(0, 15)
      .map((line): ChartDataPoint => {
        // API returns decimal (0.59 = 59%), convert to percentage
        const rawXgPct = line.expectedGoalsPct ?? 0.5;
        const xgPct = rawXgPct <= 1 ? rawXgPct * 100 : rawXgPct;
        return {
          id: line.id,
          label: getLineLabel(line),
          xgPct,
          toi: line.iceTimeSeconds,
          toiFormatted: formatToi(line.iceTimeSeconds),
          gf: line.goalsFor,
          ga: line.goalsAgainst,
          isGood: xgPct >= 50,
        };
      })
      .sort((a, b) => b.xgPct - a.xgPct);
  }, [lines]);

  if (chartData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No line data with xG% available.
      </div>
    );
  }

  // Calculate domain based on actual data
  const xgValues = chartData.map((d) => d.xgPct);
  const minXg = Math.min(...xgValues);
  const maxXg = Math.max(...xgValues);
  const padding = (maxXg - minXg) * 0.1;
  const domainMin = Math.max(30, Math.floor(minXg - padding));
  const domainMax = Math.min(70, Math.ceil(maxXg + padding));

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3">
        {isForwardLine ? "Forward Line" : "Defense Pair"} Effectiveness (xG%)
      </h3>
      <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 32)}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={CHART_AXIS_COLOURS.grid}
            strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            horizontal={false}
          />
          <XAxis
            type="number"
            domain={[domainMin, domainMax]}
            tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 10 }}
            stroke={CHART_AXIS_COLOURS.grid}
            strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            tickFormatter={(v: number) => `${v}%`}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 10 }}
            stroke={CHART_AXIS_COLOURS.grid}
            strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            width={110}
            tickLine={false}
            axisLine={false}
          />
          <ReferenceLine
            x={50}
            stroke={CHART_AXIS_COLOURS.reference}
            strokeDasharray="3 3"
            label={{
              value: "50%",
              position: "top",
              fill: CHART_AXIS_COLOURS.tick,
              fontSize: 10,
            }}
          />
          <Tooltip
            content={({ active, payload }) => (
              <LineTooltipWrapper active={active} payload={payload as Array<{ payload: ChartDataPoint }>}>
                {(data) => {
                  const d = data as ChartDataPoint;
                  return (
                    <>
                      <p>
                        <span className="text-muted-foreground">xG%:</span>{" "}
                        <span
                          className={`font-mono font-semibold ${d.isGood ? "text-success" : "text-destructive"}`}
                        >
                          {d.xgPct.toFixed(1)}%
                        </span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Goals:</span>{" "}
                        <span className="font-mono">
                          {d.gf} GF / {d.ga} GA
                        </span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">TOI:</span>{" "}
                        <span className="font-mono">{d.toiFormatted}</span>
                      </p>
                    </>
                  );
                }}
              </LineTooltipWrapper>
            )}
            cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.3 }}
          />
          <Bar dataKey="xgPct" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.isGood ? SEMANTIC_COLOURS.success : SEMANTIC_COLOURS.danger}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-muted-foreground text-center mt-2">
        Green = above 50% xG (offensive), Red = below 50% (defensive)
      </p>
    </div>
  );
}
