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
  ReferenceArea,
  ZAxis,
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
import { X, ExternalLink } from "lucide-react";
import { CHART_AXIS_COLOURS } from "@/lib/chart-colours";
import { getPlayerHeadshotUrl, getPlayerInitials } from "@/lib/player-headshots";
import { useChartSelection } from "@/hooks";
import type { LeaderboardEntry } from "@/types";

interface GoalieQuadrantChartProps {
  entries: LeaderboardEntry[];
  season?: number;
}

interface ChartDataPoint {
  playerId: number;
  name: string;
  team: string;
  gsax: number;
  savePct: number;
  gamesPlayed: number;
}

const AVG_GSAX = 0;
const AVG_SAVE_PCT = 90.5;
const MOBILE_SIZE_BOOST = 4;

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
}) {
  if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) {
    return null;
  }

  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const isElite = data.gsax > 0 && data.savePct > AVG_SAVE_PCT;

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
          <span className="text-muted-foreground">Save %:</span>{" "}
          <span className="font-mono font-semibold">
            {data.savePct.toFixed(1)}%
          </span>
        </p>
        <p>
          <span className="text-muted-foreground">GSAx:</span>{" "}
          <span
            className={`font-mono font-semibold ${data.gsax > 0 ? "text-success" : "text-destructive"}`}
          >
            {data.gsax > 0 ? "+" : ""}
            {data.gsax.toFixed(1)}
          </span>
        </p>
        <p>
          <span className="text-muted-foreground">Games Played:</span>{" "}
          <span className="font-mono">{data.gamesPlayed}</span>
        </p>
        {isElite && (
          <p className="text-success font-medium mt-1">Elite Performance</p>
        )}
      </div>
    </div>
  );
}

function CustomDot(props: {
  cx?: number;
  cy?: number;
  payload?: ChartDataPoint;
  isSelected?: boolean;
}) {
  const { cx, cy, payload, isSelected } = props;
  if (!cx || !cy || !payload) return null;

  const isMobile =
    typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  const sizeBoost = isMobile ? MOBILE_SIZE_BOOST : 0;
  const baseSize = Math.max(4, Math.min(12, 4 + payload.gamesPlayed / 8)) + sizeBoost;
  const size = isSelected ? baseSize + 2 : baseSize;
  const isPositiveGSAx = payload.gsax > 0;

  return (
    <circle
      cx={cx}
      cy={cy}
      r={size}
      fill={isPositiveGSAx ? "hsl(142, 76%, 36%)" : "hsl(0, 72%, 51%)"}
      fillOpacity={0.7}
      stroke={isSelected ? "hsl(var(--primary))" : "hsl(var(--background))"}
      strokeWidth={isSelected ? 3 : 1.5}
      style={{ transition: "r 0.15s, stroke-width 0.15s" }}
    />
  );
}

function SelectionPanel({
  data,
  onClose,
  onNavigate,
}: {
  data: ChartDataPoint;
  onClose: () => void;
  onNavigate: () => void;
}) {
  const isElite = data.gsax > 0 && data.savePct > AVG_SAVE_PCT;

  return (
    <div className="mt-3 p-3 border rounded-lg bg-muted/30 animate-in slide-in-from-bottom-2 duration-200">
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
              {isElite && <span className="ml-2 text-success text-xs">Elite</span>}
            </p>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>
                <span className="text-xs">Sv%:</span>{" "}
                <span className="font-mono">{data.savePct.toFixed(1)}%</span>
              </span>
              <span
                className={`font-mono font-semibold ${data.gsax > 0 ? "text-success" : "text-destructive"}`}
              >
                GSAx: {data.gsax > 0 ? "+" : ""}
                {data.gsax.toFixed(1)}
              </span>
              <span className="text-xs">{data.gamesPlayed} GP</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" variant="default" onClick={onNavigate}>
            View
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function GoalieQuadrantChart({ entries }: GoalieQuadrantChartProps) {
  const navigate = useNavigate();
  const { selectedItem, handleSelect, clearSelection } =
    useChartSelection<ChartDataPoint>();

  const chartData: ChartDataPoint[] = entries
    .filter(
      (e) =>
        e.goalsSavedAboveExpected != null &&
        e.savePercentage != null &&
        e.gamesPlayed >= 5
    )
    .map((entry) => ({
      playerId: entry.playerId,
      name: entry.name,
      team: entry.team ?? "",
      gsax: entry.goalsSavedAboveExpected!,
      savePct: entry.savePercentage! * 100,
      gamesPlayed: entry.gamesPlayed,
    }));

  const handleClick = (data: ChartDataPoint) => {
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

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Goalie Performance</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const gsaxValues = chartData.map((d) => d.gsax);
  const svPctValues = chartData.map((d) => d.savePct);
  const xMin = Math.floor(Math.min(...gsaxValues)) - 2;
  const xMax = Math.ceil(Math.max(...gsaxValues)) + 2;
  const yMin = Math.floor((Math.min(...svPctValues) - 0.5) * 10) / 10;
  const yMax = Math.ceil((Math.max(...svPctValues) + 0.5) * 10) / 10;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Goalie Performance Quadrant</CardTitle>
        <CardDescription>
          GSAx vs Save % - size indicates games played (min 5 GP)
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

            <ReferenceArea
              x1={xMin}
              x2={AVG_GSAX}
              y1={AVG_SAVE_PCT}
              y2={yMax}
              fill="hsl(217, 91%, 60%)"
              fillOpacity={0.08}
            />
            <ReferenceArea
              x1={AVG_GSAX}
              x2={xMax}
              y1={AVG_SAVE_PCT}
              y2={yMax}
              fill="hsl(142, 76%, 36%)"
              fillOpacity={0.08}
            />
            <ReferenceArea
              x1={xMin}
              x2={AVG_GSAX}
              y1={yMin}
              y2={AVG_SAVE_PCT}
              fill="hsl(0, 72%, 51%)"
              fillOpacity={0.08}
            />
            <ReferenceArea
              x1={AVG_GSAX}
              x2={xMax}
              y1={yMin}
              y2={AVG_SAVE_PCT}
              fill="hsl(45, 93%, 47%)"
              fillOpacity={0.08}
            />

            <XAxis
              type="number"
              dataKey="gsax"
              domain={[xMin, xMax]}
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            >
              <Label
                value="Goals Saved Above Expected (GSAx)"
                position="bottom"
                offset={15}
                style={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 12 }}
              />
            </XAxis>
            <YAxis
              type="number"
              dataKey="savePct"
              domain={[yMin, yMax]}
              tickFormatter={(v: number) => `${v.toFixed(1)}%`}
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            >
              <Label
                value="Save %"
                angle={-90}
                position="insideLeft"
                offset={10}
                style={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 12 }}
              />
            </YAxis>

            <ZAxis dataKey="gamesPlayed" range={[40, 200]} />

            <ReferenceLine
              x={AVG_GSAX}
              stroke={CHART_AXIS_COLOURS.reference}
              strokeDasharray="5 5"
              strokeWidth={1.5}
            />
            <ReferenceLine
              y={AVG_SAVE_PCT}
              stroke={CHART_AXIS_COLOURS.reference}
              strokeDasharray="5 5"
              strokeWidth={1.5}
            />

            <Tooltip content={<CustomTooltip />} />
            <Scatter
              data={chartData}
              shape={(props: { cx?: number; cy?: number; payload?: ChartDataPoint }) => (
                <CustomDot
                  {...props}
                  isSelected={selectedItem?.playerId === props.payload?.playerId}
                />
              )}
              cursor="pointer"
              onClick={(data) => handleClick(data as unknown as ChartDataPoint)}
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

        <div className="grid grid-cols-2 gap-2 mt-4 text-xs text-center">
          <div
            className="p-2 rounded"
            style={{ backgroundColor: "hsla(217, 91%, 60%, 0.15)" }}
          >
            <span className="font-medium">Lucky</span>
            <p className="text-muted-foreground">High Sv%, Negative GSAx</p>
          </div>
          <div
            className="p-2 rounded"
            style={{ backgroundColor: "hsla(142, 76%, 36%, 0.15)" }}
          >
            <span className="font-medium text-success">Elite</span>
            <p className="text-muted-foreground">High Sv%, Positive GSAx</p>
          </div>
          <div
            className="p-2 rounded"
            style={{ backgroundColor: "hsla(0, 72%, 51%, 0.15)" }}
          >
            <span className="font-medium text-destructive">Struggling</span>
            <p className="text-muted-foreground">Low Sv%, Negative GSAx</p>
          </div>
          <div
            className="p-2 rounded"
            style={{ backgroundColor: "hsla(45, 93%, 47%, 0.15)" }}
          >
            <span className="font-medium">Unlucky</span>
            <p className="text-muted-foreground">Low Sv%, Positive GSAx</p>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-3 sm:hidden">
          Tap a point to see goalie details
        </p>
      </CardContent>
    </Card>
  );
}
