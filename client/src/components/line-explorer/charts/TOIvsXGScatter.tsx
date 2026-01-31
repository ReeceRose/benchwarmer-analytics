import { useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ZAxis,
  Cell,
} from "recharts";
import { CHART_AXIS_COLOURS, SEMANTIC_COLOURS } from "@/lib/chart-colours";
import { formatToi } from "@/lib/formatters";
import { getLineLabel } from "@/components/line-explorer/charts/line-chart-utils";
import { LineTooltipWrapper } from "@/components/line-explorer/charts/LineTooltipWrapper";
import type { LineCombination } from "@/types";

interface TOIvsXGScatterProps {
  lines: LineCombination[];
  isForwardLine: boolean;
}

interface ChartDataPoint {
  id: number;
  label: string;
  toi: number;
  toiMinutes: number;
  toiFormatted: string;
  xgPct: number;
  gf: number;
  ga: number;
  gp: number;
  isGood: boolean;
}

export function TOIvsXGScatter({ lines, isForwardLine }: TOIvsXGScatterProps) {
  const chartData = useMemo(() => {
    return lines
      .filter((line) => line.expectedGoalsPct != null)
      .map((line): ChartDataPoint => {
        // API returns decimal (0.59 = 59%), convert to percentage
        const rawXgPct = line.expectedGoalsPct ?? 0.5;
        const xgPct = rawXgPct <= 1 ? rawXgPct * 100 : rawXgPct;
        return {
          id: line.id,
          label: getLineLabel(line),
          toi: line.iceTimeSeconds,
          toiMinutes: Math.round(line.iceTimeSeconds / 60),
          toiFormatted: formatToi(line.iceTimeSeconds),
          xgPct,
          gf: line.goalsFor,
          ga: line.goalsAgainst,
          gp: line.gamesPlayed,
          isGood: xgPct >= 50,
        };
      });
  }, [lines]);

  if (chartData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No line data available.
      </div>
    );
  }

  // Calculate domains
  const toiValues = chartData.map((d) => d.toiMinutes);
  const maxToi = Math.max(...toiValues);

  const xgValues = chartData.map((d) => d.xgPct);
  const minXg = Math.min(...xgValues);
  const maxXg = Math.max(...xgValues);
  const xgPadding = (maxXg - minXg) * 0.1;
  const domainMinXg = Math.max(30, Math.floor(minXg - xgPadding));
  const domainMaxXg = Math.min(70, Math.ceil(maxXg + xgPadding));

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3">
        TOI vs xG% — Are the Best Lines Getting the Most Ice Time?
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 10, right: 15, bottom: 25, left: 5 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={CHART_AXIS_COLOURS.grid}
            strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
          />
          <XAxis
            type="number"
            dataKey="toiMinutes"
            name="TOI"
            domain={[0, Math.ceil(maxToi * 1.1)]}
            tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 10 }}
            stroke={CHART_AXIS_COLOURS.grid}
            strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            label={{
              value: "TOI (min)",
              position: "bottom",
              offset: 0,
              fill: CHART_AXIS_COLOURS.tick,
              fontSize: 10,
            }}
            tickFormatter={(v: number) => `${v}m`}
          />
          <YAxis
            type="number"
            dataKey="xgPct"
            name="xG%"
            domain={[domainMinXg, domainMaxXg]}
            tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 10 }}
            stroke={CHART_AXIS_COLOURS.grid}
            strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            label={{
              value: "xG%",
              angle: -90,
              position: "insideLeft",
              fill: CHART_AXIS_COLOURS.tick,
              fontSize: 11,
            }}
            tickFormatter={(v: number) => `${v}%`}
          />
          <ZAxis type="number" dataKey="gp" range={[40, 200]} name="Games" />
          <ReferenceLine
            y={50}
            stroke={CHART_AXIS_COLOURS.reference}
            strokeDasharray="3 3"
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
                        <span className="text-muted-foreground">TOI:</span>{" "}
                        <span className="font-mono">{d.toiFormatted}</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Games:</span>{" "}
                        <span className="font-mono">{d.gp}</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Goals:</span>{" "}
                        <span className="font-mono">
                          {d.gf} GF / {d.ga} GA
                        </span>
                      </p>
                    </>
                  );
                }}
              </LineTooltipWrapper>
            )}
            cursor={{ strokeDasharray: "3 3" }}
          />
          <Scatter
            name={isForwardLine ? "Forward Lines" : "Defense Pairs"}
            data={chartData}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.isGood ? SEMANTIC_COLOURS.success : SEMANTIC_COLOURS.danger}
                fillOpacity={0.7}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <p className="text-xs text-muted-foreground text-center mt-2">
        Ideal: High xG% lines in the upper-right (most ice time). Dot size = games played.
      </p>
    </div>
  );
}
