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
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { ChartLegend } from "@/components/charts";
import { CHART_AXIS_COLOURS } from "@/lib/chart-colours";
import { getPlayerHeadshotUrl, getPlayerInitials } from "@/lib/player-headshots";
import { useChartSelection } from "@/hooks";
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

const MOBILE_DOT_RADIUS = 10;
const DESKTOP_DOT_RADIUS = 6;

function formatRate(v: number) {
  // Avoid displaying floating-point artifacts like 2.3000000000000003
  return v.toFixed(1).replace(/\.0$/, "");
}

function getNetColor(netPer60: number) {
  return netPer60 > 0 ? "var(--success)" : "var(--error)";
}

function CustomDot(props: {
  cx?: number;
  cy?: number;
  payload?: ScatterDataPoint;
  isSelected?: boolean;
}) {
  const { cx, cy, payload, isSelected } = props;
  if (!cx || !cy || !payload) return null;

  const isMobile =
    typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  const baseRadius = isMobile ? MOBILE_DOT_RADIUS : DESKTOP_DOT_RADIUS;
  const radius = isSelected ? baseRadius + 2 : baseRadius;

  return (
    <circle
      cx={cx}
      cy={cy}
      r={radius}
      fill={getNetColor(payload.netPer60)}
      stroke={isSelected ? "var(--primary)" : "var(--background)"}
      strokeWidth={isSelected ? 3 : 1.5}
      style={{ transition: "r 0.15s, stroke-width 0.15s" }}
    />
  );
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ScatterDataPoint }>;
}) {
  if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) {
    return null;
  }

  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

  return (
    <div className="rounded-xl border bg-popover text-popover-foreground shadow-lg shadow-black/5 p-3 text-sm min-w-45">
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
        <span className="tabular-nums">
          {data.drawnPer60.toFixed(2)}
        </span>
        <span className="text-muted-foreground">Taken/60:</span>
        <span className="tabular-nums">
          {data.takenPer60.toFixed(2)}
        </span>
        <span className="text-muted-foreground">Net/60:</span>
        <span
          className={`tabular-nums font-semibold ${
            data.netPer60 > 0
              ? "text-success"
              : data.netPer60 < 0
                ? "text-error"
                : ""
          }`}
        >
          {data.netPer60 > 0 ? "+" : ""}
          {data.netPer60.toFixed(2)}
        </span>
        <span className="text-muted-foreground">Total Drawn:</span>
        <span className="tabular-nums">{data.drawn}</span>
        <span className="text-muted-foreground">Total Taken:</span>
        <span className="tabular-nums">{data.taken}</span>
      </div>
    </div>
  );
}

function SelectionPanel({
  data,
  onClose,
  onNavigate,
}: {
  data: ScatterDataPoint;
  onClose: () => void;
  onNavigate: () => void;
}) {
  const isPositive = data.netPer60 > 0;

  return (
    <div className="mt-3 animate-in rounded-xl border bg-card p-3 duration-200 slide-in-from-bottom-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage
              src={getPlayerHeadshotUrl(data.playerId, data.team)}
              alt={data.name}
            />
            <AvatarFallback>{getPlayerInitials(data.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold truncate">
              {data.name}
              <span
                className={`ml-2 text-xs ${isPositive ? "text-success" : "text-error"}`}
              >
                {isPositive ? "Net positive" : "Net negative"}
              </span>
            </p>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>
                <span className="text-xs">Drawn/60:</span>{" "}
                <span className="tabular-nums text-foreground">
                  {data.drawnPer60.toFixed(2)}
                </span>
              </span>
              <span>
                <span className="text-xs">Taken/60:</span>{" "}
                <span className="tabular-nums text-foreground">
                  {data.takenPer60.toFixed(2)}
                </span>
              </span>
              <span
                className={`tabular-nums font-semibold ${isPositive ? "text-success" : "text-error"}`}
              >
                {isPositive ? "+" : ""}
                {data.netPer60.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" variant="outline" onClick={onNavigate}>
            Player page
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PenaltyDiffScatter({
  players,
  scopeLabel,
}: PenaltyDiffScatterProps) {
  const navigate = useNavigate();
  const { selectedItem, handleSelect, clearSelection } =
    useChartSelection<ScatterDataPoint>();

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
    if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) {
      handleSelect(data);
    } else {
      navigate({
        to: "/players/$id",
        params: { id: String(data.playerId) },
      });
    }
  };

  const handleNavigateToPlayer = () => {
    if (selectedItem) {
      navigate({
        to: "/players/$id",
        params: { id: String(selectedItem.playerId) },
      });
    }
  };

  if (players.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Penalties drawn vs taken</CardTitle>
          <CardDescription>No players meet these filters. Try a lower minimum.</CardDescription>
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
        <CardTitle className="text-base">Penalties drawn vs taken</CardTitle>
        <CardDescription>
          Per 60 minutes. Players below the diagonal draw more than they take.
          {scopeLabel ? (
            <span> Showing the {scopeLabel}.</span>
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
                value="Drawn per 60"
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
                value="Taken per 60"
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
              shape={(props: { cx?: number; cy?: number; payload?: ScatterDataPoint }) => (
                <CustomDot
                  {...props}
                  isSelected={selectedItem?.playerId === props.payload?.playerId}
                />
              )}
              cursor="pointer"
              onClick={(data) =>
                handleClick(data as unknown as ScatterDataPoint)
              }
              fillOpacity={0.85}
            />
          </ScatterChart>
        </ResponsiveContainer>

        {selectedItem && (
          <SelectionPanel
            data={selectedItem}
            onClose={clearSelection}
            onNavigate={handleNavigateToPlayer}
          />
        )}
        <ChartLegend
          className="mt-4 justify-center"
          items={[
            { label: "Below the line: draws more than takes", colour: "var(--success)" },
            { label: "Above the line: takes more than draws", colour: "var(--error)" },
          ]}
        />

        <p className="mt-3 text-xs text-muted-foreground sm:hidden">
          Tap a player for details.
        </p>
      </CardContent>
    </Card>
  );
}
