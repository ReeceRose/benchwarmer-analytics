import { useNavigate } from "@tanstack/react-router";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Label,
  ReferenceArea,
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
import type { PlayerPenaltyStats } from "@/types";

interface PenaltyDiffScatterProps {
  players: PlayerPenaltyStats[];
  scopeLabel?: string;
}

interface ScatterDataPoint {
  playerId: number;
  name: string;
  team: string;
  drawn: number;
  taken: number;
  drawnPer60: number;
  takenPer60: number;
  netPer60: number;
  toi: number;
}

function formatRate(v: number) {
  // Avoid displaying floating-point artifacts like 2.3000000000000003
  return v.toFixed(1).replace(/\.0$/, "");
}

function getNetColor(netPer60: number) {
  return netPer60 > 0 ? "hsl(142, 76%, 36%)" : "hsl(0, 72%, 51%)";
}

function CustomDot(props: {
  cx?: number;
  cy?: number;
  payload?: ScatterDataPoint;
}) {
  const { cx, cy, payload } = props;
  if (!cx || !cy || !payload) return null;

  return (
    <circle
      cx={cx}
      cy={cy}
      r={6}
      fill={getNetColor(payload.netPer60)}
      stroke="hsl(var(--background))"
      strokeWidth={1.5}
    />
  );
}

// Custom tooltip
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ScatterDataPoint }>;
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm min-w-45">
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
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <span className="text-muted-foreground">Drawn/60:</span>
        <span className="font-mono text-green-600 dark:text-green-400">
          {data.drawnPer60.toFixed(2)}
        </span>
        <span className="text-muted-foreground">Taken/60:</span>
        <span className="font-mono text-red-600 dark:text-red-400">
          {data.takenPer60.toFixed(2)}
        </span>
        <span className="text-muted-foreground">Net/60:</span>
        <span
          className={`font-mono font-semibold ${
            data.netPer60 > 0
              ? "text-green-600 dark:text-green-400"
              : data.netPer60 < 0
                ? "text-red-600 dark:text-red-400"
                : ""
          }`}
        >
          {data.netPer60 > 0 ? "+" : ""}
          {data.netPer60.toFixed(2)}
        </span>
        <span className="text-muted-foreground">Total Drawn:</span>
        <span className="font-mono">{data.drawn}</span>
        <span className="text-muted-foreground">Total Taken:</span>
        <span className="font-mono">{data.taken}</span>
      </div>
    </div>
  );
}

export function PenaltyDiffScatter({
  players,
  scopeLabel,
}: PenaltyDiffScatterProps) {
  const navigate = useNavigate();

  // Prepare scatter data
  const scatterData: ScatterDataPoint[] = players.map((player) => ({
    playerId: player.playerId,
    name: player.name,
    team: player.team,
    drawn: player.penaltiesDrawn,
    taken: player.penaltiesTaken,
    drawnPer60: player.penaltiesDrawnPer60,
    takenPer60: player.penaltiesTakenPer60,
    netPer60: player.netPenaltiesPer60,
    toi: player.iceTimeMinutes,
  }));

  const handleClick = (data: ScatterDataPoint) => {
    navigate({
      to: "/players/$id",
      params: { id: String(data.playerId) },
    });
  };

  if (players.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Penalty Drawing vs Taking</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Calculate averages for reference lines
  const avgDrawn =
    scatterData.reduce((sum, d) => sum + d.drawnPer60, 0) / scatterData.length;
  const avgTaken =
    scatterData.reduce((sum, d) => sum + d.takenPer60, 0) / scatterData.length;

  // Calculate domain
  const drawnValues = scatterData.map((d) => d.drawnPer60);
  const takenValues = scatterData.map((d) => d.takenPer60);
  const maxDrawn = Number(
    (Math.ceil(Math.max(...drawnValues) * 10) / 10 + 0.1).toFixed(1),
  );
  const maxTaken = Number(
    (Math.ceil(Math.max(...takenValues) * 10) / 10 + 0.1).toFixed(1),
  );
  const maxDiag = Math.min(maxDrawn, maxTaken);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Penalty Drawing vs Taking</CardTitle>
        <CardDescription>
          Penalties drawn per 60 (X) vs taken per 60 (Y). Players below the
          diagonal line have positive net impact.
          {scopeLabel ? (
            <span className="text-muted-foreground"> Showing: {scopeLabel}.</span>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={450}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            />

            <ReferenceArea
              x1={avgDrawn}
              x2={maxDrawn}
              y1={0}
              y2={avgTaken}
              fill="hsl(142, 76%, 36%)"
              fillOpacity={0.08}
            />
            <ReferenceArea
              x1={0}
              x2={avgDrawn}
              y1={avgTaken}
              y2={maxTaken}
              fill="hsl(0, 72%, 51%)"
              fillOpacity={0.08}
            />

            <XAxis
              type="number"
              dataKey="drawnPer60"
              name="Drawn/60"
              domain={[0, maxDrawn]}
              tickFormatter={(v: number) => formatRate(v)}
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            >
              <Label
                value="Penalties Drawn / 60"
                position="bottom"
                offset={15}
                style={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 12 }}
              />
            </XAxis>
            <YAxis
              type="number"
              dataKey="takenPer60"
              name="Taken/60"
              domain={[0, maxTaken]}
              tickFormatter={(v: number) => formatRate(v)}
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            >
              <Label
                value="Penalties Taken / 60"
                angle={-90}
                position="insideLeft"
                offset={10}
                style={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 12 }}
              />
            </YAxis>
            <ZAxis type="number" dataKey="toi" range={[40, 200]} />

            <ReferenceLine
              segment={[
                { x: 0, y: 0 },
                { x: maxDiag, y: maxDiag },
              ]}
              stroke={CHART_AXIS_COLOURS.reference}
              strokeDasharray="5 5"
              strokeWidth={1.5}
            />

            <ReferenceLine
              x={avgDrawn}
              stroke={CHART_AXIS_COLOURS.reference}
              strokeDasharray="5 5"
              strokeWidth={1.5}
            />
            <ReferenceLine
              y={avgTaken}
              stroke={CHART_AXIS_COLOURS.reference}
              strokeDasharray="5 5"
              strokeWidth={1.5}
            />

            <Tooltip content={<CustomTooltip />} />

            <Scatter
              data={scatterData}
              shape={<CustomDot />}
              cursor="pointer"
              onClick={(data) =>
                handleClick(data as unknown as ScatterDataPoint)
              }
              fillOpacity={0.85}
            />
          </ScatterChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-8 mt-4 text-xs">
          <div
            className="flex items-center gap-2"
          >
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: "hsl(142, 76%, 36%)" }}
            />
            <span className="text-muted-foreground">
              Below line = Net positive (best)
            </span>
          </div>
          <div
            className="flex items-center gap-2"
          >
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: "hsl(0, 72%, 51%)" }}
            />
            <span className="text-muted-foreground">
              Above line = Net negative (worst)
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
