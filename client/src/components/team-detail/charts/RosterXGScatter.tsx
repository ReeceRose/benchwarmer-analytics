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
import type { RosterPlayer } from "@/types/player";

interface RosterXGScatterProps {
  players: RosterPlayer[];
  teamAbbrev: string;
}

interface ChartDataPoint {
  playerId: number;
  name: string;
  team: string;
  goals: number;
  expectedGoals: number;
  diff: number;
  position: string;
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
  const isOverperforming = data.diff > 0;

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
        <span className="text-muted-foreground text-xs">({data.position})</span>
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
        <p className={isOverperforming ? "text-success" : "text-destructive"}>
          <span className="text-muted-foreground">Difference:</span>{" "}
          <span className="font-mono font-semibold">
            {isOverperforming ? "+" : ""}
            {data.diff.toFixed(1)}
          </span>
          <span className="ml-1">
            ({isOverperforming ? "Overperforming" : "Underperforming"})
          </span>
        </p>
      </div>
    </div>
  );
}

function CustomDot(props: {
  cx?: number;
  cy?: number;
  payload?: ChartDataPoint;
}) {
  const { cx, cy, payload } = props;
  if (!cx || !cy || !payload) return null;

  const isOverperforming = payload.diff > 0;
  const size = 12;

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
            border: `2px solid ${isOverperforming ? "hsl(142, 76%, 36%)" : "hsl(0, 72%, 51%)"}`,
          }}
        />
      </foreignObject>
    </g>
  );
}

export function RosterXGScatter({ players, teamAbbrev }: RosterXGScatterProps) {
  const navigate = useNavigate();

  // Filter to skaters with xG data
  const chartData: ChartDataPoint[] = players
    .filter(
      (p) =>
        p.position !== "G" &&
        p.expectedGoals != null &&
        p.expectedGoals > 0 &&
        p.goals != null
    )
    .map((player) => ({
      playerId: player.id,
      name: player.name,
      team: player.currentTeamAbbreviation ?? teamAbbrev,
      goals: player.goals ?? 0,
      expectedGoals: player.expectedGoals ?? 0,
      diff: (player.goals ?? 0) - (player.expectedGoals ?? 0),
      position: player.position ?? "F",
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
          <CardTitle className="text-lg">xG vs Goals</CardTitle>
          <CardDescription>
            No expected goals data available for this roster
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Calculate domain
  const allValues = chartData.flatMap((d) => [d.goals, d.expectedGoals]);
  const minVal = Math.max(0, Math.floor(Math.min(...allValues)) - 1);
  const maxVal = Math.ceil(Math.max(...allValues)) + 1;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Expected Goals vs Actual Goals</CardTitle>
        <CardDescription>
          Players above the line are outperforming expectations; below are
          underperforming
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
              Above line = Outperforming xG
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full border-2"
              style={{ borderColor: "hsl(0, 72%, 51%)" }}
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
