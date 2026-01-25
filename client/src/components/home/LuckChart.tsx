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
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles } from "lucide-react";
import { CHART_AXIS_COLOURS } from "@/lib/chart-colours";
import { getPlayerHeadshotUrl, getPlayerInitials } from "@/lib/player-headshots";
import type { OutlierEntry } from "@/types";

interface LuckChartProps {
  runningHot: OutlierEntry[];
  runningCold: OutlierEntry[];
}

interface ChartDataPoint {
  playerId: number;
  name: string;
  team?: string;
  xG: number;
  goals: number;
  differential: number;
}

// Colors for hot (above line) and cold (below line)
const HOT_COLOR = "hsl(142, 76%, 36%)"; // green
const COLD_COLOR = "hsl(0, 72%, 51%)"; // red

function getPointColor(differential: number) {
  return differential > 0 ? HOT_COLOR : COLD_COLOR;
}

function CustomDot(props: {
  cx?: number;
  cy?: number;
  payload?: ChartDataPoint;
}) {
  const { cx, cy, payload } = props;
  if (!cx || !cy || !payload) return null;

  return (
    <circle
      cx={cx}
      cy={cy}
      r={6}
      fill={getPointColor(payload.differential)}
      stroke="hsl(var(--background))"
      strokeWidth={1.5}
    />
  );
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const isHot = data.differential > 0;

  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm min-w-40">
      <div className="flex items-center gap-2 mb-2">
        <Avatar className="h-6 w-6">
          <AvatarImage
            src={getPlayerHeadshotUrl(data.playerId, data.team)}
            alt={data.name}
            loading="lazy"
          />
          <AvatarFallback className="text-xs">
            {getPlayerInitials(data.name)}
          </AvatarFallback>
        </Avatar>
        <span className="font-semibold">{data.name}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <span className="text-muted-foreground">Goals:</span>
        <span className="font-mono">{data.goals}</span>
        <span className="text-muted-foreground">xG:</span>
        <span className="font-mono">{data.xG.toFixed(1)}</span>
        <span className="text-muted-foreground">Diff:</span>
        <span
          className={`font-mono font-semibold ${
            isHot
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {isHot ? "+" : ""}
          {data.differential.toFixed(1)}
        </span>
      </div>
    </div>
  );
}

export function LuckChart({ runningHot, runningCold }: LuckChartProps) {
  const navigate = useNavigate();

  // Combine hot and cold data for the scatter plot
  const chartData: ChartDataPoint[] = [
    ...runningHot.map((p) => ({
      playerId: p.playerId,
      name: p.name,
      team: p.team,
      xG: p.expectedGoals,
      goals: p.goals,
      differential: p.differential,
    })),
    ...runningCold.map((p) => ({
      playerId: p.playerId,
      name: p.name,
      team: p.team,
      xG: p.expectedGoals,
      goals: p.goals,
      differential: p.differential,
    })),
  ];

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Luck vs. Skill
          </CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleClick = (data: ChartDataPoint) => {
    navigate({
      to: "/players/$id",
      params: { id: data.playerId.toString() },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Luck vs. Skill
        </CardTitle>
        <CardDescription>
          Players above the line are outperforming expected goals
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_AXIS_COLOURS.grid} strokeOpacity={CHART_AXIS_COLOURS.gridOpacity} />
            <XAxis
              dataKey="xG"
              name="Expected Goals"
              type="number"
              domain={[
                (dataMin: number) => Math.max(0, Math.floor(dataMin - 2)),
                (dataMax: number) => Math.ceil(dataMax + 2),
              ]}
              tickCount={6}
              tickFormatter={(v: number) => v.toFixed(0)}
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 12 }}
              label={{
                value: "Expected Goals (xG)",
                position: "bottom",
                offset: 0,
                fill: CHART_AXIS_COLOURS.tick,
                fontSize: 12,
              }}
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            />
            <YAxis
              dataKey="goals"
              name="Goals"
              type="number"
              domain={[
                (dataMin: number) => Math.max(0, Math.floor(dataMin - 2)),
                (dataMax: number) => Math.ceil(dataMax + 2),
              ]}
              tickCount={6}
              tickFormatter={(v: number) => v.toFixed(0)}
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 12 }}
              label={{
                value: "Actual Goals",
                angle: -90,
                position: "insideLeft",
                fill: CHART_AXIS_COLOURS.tick,
                fontSize: 12,
              }}
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              ifOverflow="hidden"
              segment={[
                { x: 0, y: 0 },
                { x: 100, y: 100 },
              ]}
              stroke={CHART_AXIS_COLOURS.reference}
              strokeDasharray="5 5"
              strokeWidth={2}
            />
            <Scatter
              data={chartData}
              shape={<CustomDot />}
              cursor="pointer"
              onClick={(data) => handleClick(data as unknown as ChartDataPoint)}
              fillOpacity={0.85}
            />
          </ScatterChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-8 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: HOT_COLOR }}
            />
            <span className="text-muted-foreground">
              Above line = Running hot
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: COLD_COLOR }}
            />
            <span className="text-muted-foreground">
              Below line = Running cold
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
