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
import { CHART_AXIS_COLOURS } from "@/lib/chart-colours";
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
      <h4 className="mb-2 text-sm font-medium">Shots against</h4>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
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
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
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
              stroke={CHART_AXIS_COLOURS.reference}
              strokeDasharray="5 5"
              label={{
                value: "30+ is a heavy night",
                position: "insideTopLeft",
                fontSize: 10,
                fill: CHART_AXIS_COLOURS.tick,
              }}
            />
            <Area
              type="linear"
              dataKey="shotsAgainst"
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill="var(--chart-1)"
              fillOpacity={0.08}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
