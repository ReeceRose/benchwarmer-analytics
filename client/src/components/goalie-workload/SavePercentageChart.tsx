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
import { CHART_AXIS_COLOURS, CHART_GRADIENT_COLOURS } from "@/lib/chart-colours";
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
  return (
    <div>
      <h4 className="text-sm font-medium mb-2">Save Percentage Trend</h4>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="svPctGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={CHART_GRADIENT_COLOURS.primary}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={CHART_GRADIENT_COLOURS.primary}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
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
              width={45}
              domain={[0.85, 1.0]}
              tickFormatter={(v) => v.toFixed(3)}
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
                value: "Avg (.910)",
                position: "right",
                fontSize: 9,
                fill: CHART_AXIS_COLOURS.tick,
              }}
            />
            <Line
              type="monotone"
              dataKey="savePercentage"
              stroke={CHART_GRADIENT_COLOURS.primary}
              strokeWidth={2}
              dot={{
                fill: CHART_GRADIENT_COLOURS.primary,
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
