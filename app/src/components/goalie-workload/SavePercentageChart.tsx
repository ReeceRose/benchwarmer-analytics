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
import { niceAxis } from "@/components/charts/nice-axis";
import { CHART_AXIS_COLOURS } from "@/lib/chart-colours";
import { formatSavePct } from "@/lib/formatters";
import { GoalieGameTooltip } from "@/components/goalie-workload/GoalieGameTooltip";

interface ChartDataPoint {
  game: number;
  opponent: string;
  shotsAgainst: number;
  savePercentage: number;
  gsax: number;
  isB2B: boolean;
}

interface SavePercentageChartProps {
  data: ChartDataPoint[];
}

export function SavePercentageChart({ data }: SavePercentageChartProps) {
  // Round ticks that always take in .900 and 1.000, however bad a night got.
  const { domain, ticks } = niceAxis([0.9, 1, ...data.map((d) => d.savePercentage)]);
  return (
    <div>
      <h4 className="mb-2 text-sm font-medium">Save %</h4>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            />
            <XAxis
              dataKey="game"
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 10 }}
              tickFormatter={(v) => `G${v}`}
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            />
            <YAxis
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 10 }}
              width={44}
              domain={domain}
              ticks={ticks}
              tickFormatter={(v: number) => formatSavePct(v)}
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            />
            <Tooltip
              content={({ active, payload }) => (
                <GoalieGameTooltip
                  active={active}
                  payload={payload as Array<{ payload: ChartDataPoint }>}
                  primaryStat="savePercentage"
                />
              )}
            />
            <ReferenceLine
              y={0.91}
              stroke={CHART_AXIS_COLOURS.tick}
              strokeDasharray="5 5"
              label={{
                value: "League average .910",
                position: "insideBottomRight",
                fontSize: 10,
                fill: CHART_AXIS_COLOURS.tick,
              }}
            />
            <Line
              type="linear"
              dataKey="savePercentage"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={{
                fill: "var(--chart-1)",
                strokeWidth: 0,
                r: 3,
              }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
