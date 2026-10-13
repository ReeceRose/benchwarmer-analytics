import { useMemo } from "react";
import { ChartLegend } from "@/components/charts/ChartLegend";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CHART_AXIS_COLOURS, SEMANTIC_COLOURS } from "@/lib/chart-colours";
import { formatToi } from "@/lib/formatters";
import { getLineLabel } from "@/components/line-explorer/charts/line-chart-utils";
import { LineTooltipWrapper } from "@/components/line-explorer/charts/LineTooltipWrapper";
import type { LineCombination } from "@/types";
import { EmptyState } from "@/components/layout";

interface GoalsForAgainstChartProps {
  lines: LineCombination[];
  isForwardLine: boolean;
}

interface ChartDataPoint {
  id: number;
  label: string;
  gf: number;
  ga: number;
  diff: number;
  toi: number;
  toiFormatted: string;
  xgPct: number | null;
}

export function GoalsForAgainstChart({
  lines,
  isForwardLine,
}: GoalsForAgainstChartProps) {
  const chartData = useMemo(() => {
    // Sort by goal differential and take top 15
    return lines
      .filter((line) => line.goalsFor > 0 || line.goalsAgainst > 0)
      .map((line): ChartDataPoint => ({
        id: line.id,
        label: getLineLabel(line),
        gf: line.goalsFor,
        ga: line.goalsAgainst,
        diff: line.goalsFor - line.goalsAgainst,
        toi: line.iceTimeSeconds,
        toiFormatted: formatToi(line.iceTimeSeconds),
        xgPct: line.expectedGoalsPct ?? null,
      }))
      .sort((a, b) => b.diff - a.diff)
      .slice(0, 15);
  }, [lines]);

  if (chartData.length === 0) {
    return (
      <EmptyState className="py-8" title="None of these lines have scored or allowed a goal yet" />
    );
  }

  // Calculate max for symmetric domain
  const maxValue = Math.max(...chartData.map((d) => Math.max(d.gf, d.ga)));
  const domain = [0, Math.ceil(maxValue * 1.1)];

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3">
        Goals for and against by {isForwardLine ? "forward line" : "defense pair"}
      </h3>
      <ChartLegend
        className="mb-2"
        items={[
          { label: "Goals for", colour: SEMANTIC_COLOURS.success },
          { label: "Goals against", colour: SEMANTIC_COLOURS.danger },
        ]}
      />
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
            domain={domain}
            tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 10 }}
            stroke={CHART_AXIS_COLOURS.grid}
            strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
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
          <Tooltip
            content={({ active, payload }) => (
              <LineTooltipWrapper active={active} payload={payload as Array<{ payload: ChartDataPoint }>}>
                {(data) => {
                  const d = data as ChartDataPoint;
                  const diffSign = d.diff > 0 ? "+" : "";
                  const diffColor =
                    d.diff > 0 ? "text-success" : d.diff < 0 ? "text-error" : "";
                  return (
                    <>
                      <p>
                        <span className="text-muted-foreground">Goals For:</span>{" "}
                        <span className="tabular-nums text-success">{d.gf}</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Goals Against:</span>{" "}
                        <span className="tabular-nums text-error">{d.ga}</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Differential:</span>{" "}
                        <span className={`tabular-nums font-semibold ${diffColor}`}>
                          {diffSign}
                          {d.diff}
                        </span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">TOI:</span>{" "}
                        <span className="tabular-nums">{d.toiFormatted}</span>
                      </p>
                      {d.xgPct != null && (
                        <p>
                          <span className="text-muted-foreground">xG%:</span>{" "}
                          <span className="tabular-nums">{d.xgPct.toFixed(1)}%</span>
                        </p>
                      )}
                    </>
                  );
                }}
              </LineTooltipWrapper>
            )}
            cursor={{ fill: "var(--muted)", fillOpacity: 0.3 }}
          />
          <Bar
            dataKey="gf"
            name="Goals for"
            fill={SEMANTIC_COLOURS.success}
            radius={4}
            fillOpacity={0.85}
          />
          <Bar
            dataKey="ga"
            name="Goals against"
            fill={SEMANTIC_COLOURS.danger}
            radius={4}
            fillOpacity={0.85}
          />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-muted-foreground text-center mt-2">
        Lines sorted by goal differential (best to worst)
      </p>
    </div>
  );
}
