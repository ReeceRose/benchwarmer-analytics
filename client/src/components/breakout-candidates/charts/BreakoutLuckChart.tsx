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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CHART_AXIS_COLOURS } from "@/lib/chart-colours";
import { getPlayerHeadshotUrl, getPlayerInitials } from "@/lib/player-headshots";
import type { BreakoutCandidate } from "@/types";

interface BreakoutLuckChartProps {
  candidates: BreakoutCandidate[];
}

interface ChartDataPoint {
  playerId: number;
  name: string;
  team: string;
  goals: number;
  expectedGoals: number;
  diff: number;
  breakoutScore: number;
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
  const isUnlucky = data.diff > 0;

  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
      <div className="flex items-center gap-2 mb-2">
        <Avatar className="h-6 w-6">
          <AvatarImage
            src={getPlayerHeadshotUrl(data.playerId, data.team)}
            alt={data.name}
            loading="lazy"
          />
          <AvatarFallback className="text-[10px]">
            {getPlayerInitials(data.name)}
          </AvatarFallback>
        </Avatar>
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
        <p className={isUnlucky ? "text-success" : "text-muted-foreground"}>
          <span className="text-muted-foreground">Difference:</span>{" "}
          <span className="font-mono font-semibold">
            {isUnlucky ? "+" : ""}
            {data.diff.toFixed(1)}
          </span>
          {isUnlucky && <span className="ml-1">(Breakout Candidate)</span>}
        </p>
        <p>
          <span className="text-muted-foreground">Breakout Score:</span>{" "}
          <span className="font-mono font-semibold">
            {data.breakoutScore.toFixed(1)}
          </span>
        </p>
      </div>
    </div>
  );
}

// Custom dot with player headshot using foreignObject for better image loading
function CustomDot(props: {
  cx?: number;
  cy?: number;
  payload?: ChartDataPoint;
}) {
  const { cx, cy, payload } = props;
  if (!cx || !cy || !payload) return null;

  const isUnlucky = payload.diff > 0;
  const size = 12; // radius

  return (
    <g>
      <foreignObject
        x={cx - size}
        y={cy - size}
        width={size * 2}
        height={size * 2}
      >
        <img
          src={getPlayerHeadshotUrl(payload.playerId, payload.team)}
          alt={payload.name}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            objectFit: "cover",
            border: `2px solid ${isUnlucky ? "hsl(142, 76%, 36%)" : "hsl(var(--muted-foreground))"}`,
          }}
        />
      </foreignObject>
    </g>
  );
}

export function BreakoutLuckChart({ candidates }: BreakoutLuckChartProps) {
  const navigate = useNavigate();

  // Prepare chart data
  const chartData: ChartDataPoint[] = candidates
    .filter((c) => c.expectedGoals > 0)
    .map((candidate) => ({
      playerId: candidate.playerId,
      name: candidate.name,
      team: candidate.team,
      goals: candidate.goals,
      expectedGoals: candidate.expectedGoals,
      diff: candidate.goalsDifferential,
      breakoutScore: candidate.breakoutScore,
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
          <CardTitle>xG vs Goals</CardTitle>
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
        <CardTitle className="text-lg">Expected Goals vs Actual Goals</CardTitle>
        <CardDescription>
          Players below the line have scored fewer goals than expected - key
          breakout candidates
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
              className="w-3 h-3 rounded-full border-2"
              style={{ borderColor: "hsl(142, 76%, 36%)" }}
            />
            <span className="text-muted-foreground">
              Below line = Breakout candidate (unlucky)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full border-2 border-muted-foreground" />
            <span className="text-muted-foreground">
              Above line = Outperforming xG
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
