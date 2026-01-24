import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { CHART_AXIS_COLORS, CHART_GRADIENT_COLORS } from "@/lib/chart-colors";
import { GoalieGameTooltip } from "@/components/goalie-workload/GoalieGameTooltip";

interface ChartDataPoint {
  game: number;
  opponent: string;
  shotsAgainst: number;
  savePercentage: number;
  gsax: number;
  isB2B: boolean;
}

interface ShotsAgainstChartProps {
  data: ChartDataPoint[];
}

export function ShotsAgainstChart({ data }: ShotsAgainstChartProps) {
  return (
    <div>
      <h4 className="text-sm font-medium mb-2">Shots Against Trend</h4>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="saGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={CHART_GRADIENT_COLORS.danger}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={CHART_GRADIENT_COLORS.danger}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={CHART_AXIS_COLORS.grid}
              strokeOpacity={CHART_AXIS_COLORS.gridOpacity}
            />
            <XAxis
              dataKey="game"
              tick={{ fill: CHART_AXIS_COLORS.tick, fontSize: 10 }}
              tickFormatter={(v) => `G${v}`}
              stroke={CHART_AXIS_COLORS.grid}
              strokeOpacity={CHART_AXIS_COLORS.gridOpacity}
            />
            <YAxis
              tick={{ fill: CHART_AXIS_COLORS.tick, fontSize: 10 }}
              width={30}
              stroke={CHART_AXIS_COLORS.grid}
              strokeOpacity={CHART_AXIS_COLORS.gridOpacity}
            />
            <Tooltip
              content={({ active, payload }) => (
                <GoalieGameTooltip
                  active={active}
                  payload={payload as Array<{ payload: ChartDataPoint }>}
                  primaryStat="shotsAgainst"
                />
              )}
            />
            <ReferenceLine
              y={30}
              stroke={CHART_GRADIENT_COLORS.danger}
              strokeDasharray="5 5"
              label={{
                value: "High (30)",
                position: "right",
                fontSize: 9,
                fill: CHART_GRADIENT_COLORS.danger,
              }}
            />
            <Area
              type="monotone"
              dataKey="shotsAgainst"
              stroke={CHART_GRADIENT_COLORS.danger}
              strokeWidth={2}
              fill="url(#saGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
