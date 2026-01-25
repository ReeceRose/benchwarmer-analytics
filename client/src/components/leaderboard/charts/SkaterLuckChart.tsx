import { useNavigate } from "@tanstack/react-router";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Label,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { TeamLogo } from "@/components/shared";
import { CHART_AXIS_COLOURS } from "@/lib/chart-colours";
import type { LeaderboardEntry } from "@/types";

interface SkaterLuckChartProps {
  entries: LeaderboardEntry[];
  season?: number;
}

interface ChartDataPoint {
  playerId: number;
  name: string;
  team: string;
  goals: number;
  expectedGoals: number;
  diff: number;
}

// Custom tooltip
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const isLucky = data.diff > 0;

  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
      <div className="flex items-center gap-2 mb-2">
        <TeamLogo abbrev={data.team} size="sm" />
        <span className="font-semibold">{data.name}</span>
      </div>
      <div className="space-y-1 text-xs">
        <p>
          <span className="text-muted-foreground">Goals:</span>{" "}
          <span className="font-mono font-semibold">{data.goals}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Expected Goals:</span>{" "}
          <span className="font-mono">{data.expectedGoals.toFixed(1)}</span>
        </p>
        <p className={isLucky ? "text-warning" : "text-success"}>
          <span className="text-muted-foreground">Difference:</span>{" "}
          <span className="font-mono font-semibold">
            {isLucky ? "+" : ""}
            {data.diff.toFixed(1)}
          </span>
          <span className="ml-1">
            ({isLucky ? "Overperforming" : "Underperforming"})
          </span>
        </p>
      </div>
    </div>
  );
}

// Custom dot
function CustomDot(props: {
  cx?: number;
  cy?: number;
  payload?: ChartDataPoint;
}) {
  const { cx, cy, payload } = props;
  if (!cx || !cy || !payload) return null;

  const isLucky = payload.diff > 0;

  return (
    <circle
      cx={cx}
      cy={cy}
      r={6}
      fill={isLucky ? "hsl(45, 93%, 47%)" : "hsl(142, 76%, 36%)"}
      stroke="hsl(var(--background))"
      strokeWidth={1.5}
    />
  );
}

export function SkaterLuckChart({ entries }: SkaterLuckChartProps) {
  const navigate = useNavigate();

  // Filter to entries with both goals and xG data
  const chartData: ChartDataPoint[] = entries
    .filter((e) => e.goals != null && e.expectedGoals != null && e.expectedGoals > 0)
    .map((entry) => ({
      playerId: entry.playerId,
      name: entry.name,
      team: entry.team ?? "",
      goals: entry.goals!,
      expectedGoals: entry.expectedGoals!,
      diff: entry.goals! - entry.expectedGoals!,
    }));

  const handleClick = (data: ChartDataPoint) => {
    navigate({
      to: "/players/$id",
      params: { id: String(data.playerId) },
    });
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Goals vs Expected Goals</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Calculate domain
  const allValues = chartData.flatMap((d) => [d.goals, d.expectedGoals]);
  const minVal = Math.floor(Math.min(...allValues)) - 2;
  const maxVal = Math.ceil(Math.max(...allValues)) + 2;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Goals vs Expected Goals</CardTitle>
        <CardDescription>
          Players above the line are outperforming their expected goals
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            />

            <XAxis
              type="number"
              dataKey="expectedGoals"
              domain={[minVal, maxVal]}
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            >
              <Label
                value="Expected Goals (xG)"
                position="bottom"
                offset={15}
                style={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 12 }}
              />
            </XAxis>
            <YAxis
              type="number"
              dataKey="goals"
              domain={[minVal, maxVal]}
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            >
              <Label
                value="Actual Goals"
                angle={-90}
                position="insideLeft"
                offset={10}
                style={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 12 }}
              />
            </YAxis>

            {/* 45-degree reference line */}
            <ReferenceLine
              segment={[
                { x: minVal, y: minVal },
                { x: maxVal, y: maxVal },
              ]}
              stroke={CHART_AXIS_COLOURS.reference}
              strokeDasharray="5 5"
              strokeWidth={1.5}
            />

            <Tooltip content={<CustomTooltip />} />
            <Scatter
              data={chartData}
              shape={<CustomDot />}
              cursor="pointer"
              onClick={(data) => handleClick(data as unknown as ChartDataPoint)}
            />
          </ScatterChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-8 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: "hsl(45, 93%, 47%)" }}
            />
            <span className="text-muted-foreground">
              Above line = Overperforming xG
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: "hsl(142, 76%, 36%)" }}
            />
            <span className="text-muted-foreground">
              Below line = Underperforming xG
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
