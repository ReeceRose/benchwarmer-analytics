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
import { EmptyState } from "@/components/layout";

interface LineEffectivenessChartProps {
  lines: LineCombination[];
  isForwardLine: boolean;
}

interface ChartDataPoint {
  id: number;
  label: string;
  xgPct: number;
  /** Points above or below an even share; the bars are drawn from here. */
  diff: number;
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
          diff: xgPct - 50,
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
      <EmptyState className="py-8" title="No line data with xG yet" />
    );
  }

  // Bars grow out from 50% on a symmetric scale, so length is the distance from even.
  const span = Math.min(25, Math.max(5, Math.ceil(Math.max(...chartData.map((d) => Math.abs(d.diff))) / 5) * 5));

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3">
        {isForwardLine ? "Forward line" : "Defense pair"} effectiveness (xG%)
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
            domain={[-span, span]}
            tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 10 }}
            stroke={CHART_AXIS_COLOURS.grid}
            strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            tickFormatter={(v: number) => `${v + 50}%`}
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
          <ReferenceLine x={0} stroke={CHART_AXIS_COLOURS.reference} />
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
                          className={`tabular-nums font-semibold ${d.isGood ? "text-success" : "text-error"}`}
                        >
                          {d.xgPct.toFixed(1)}%
                        </span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Goals:</span>{" "}
                        <span className="tabular-nums">
                          {d.gf} GF / {d.ga} GA
                        </span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">TOI:</span>{" "}
                        <span className="tabular-nums">{d.toiFormatted}</span>
                      </p>
                    </>
                  );
                }}
              </LineTooltipWrapper>
            )}
            cursor={{ fill: "var(--muted)", fillOpacity: 0.3 }}
          />
          <Bar dataKey="diff" radius={4}>
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
      <p className="mt-2 text-xs text-muted-foreground">
        Bars grow from an even 50% share of expected goals. Green lines out-chanced their opponents; red lines were out-chanced.
      </p>
    </div>
  );
}
