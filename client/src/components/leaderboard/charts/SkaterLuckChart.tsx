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
import { Button } from "@/components/ui/button";
import { X, ExternalLink } from "lucide-react";
import { CHART_AXIS_COLOURS } from "@/lib/chart-colours";
import { getPlayerHeadshotUrl, getPlayerInitials } from "@/lib/player-headshots";
import { useChartSelection } from "@/hooks";
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

const MOBILE_DOT_RADIUS = 10;
const DESKTOP_DOT_RADIUS = 6;

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
  const isLucky = data.diff > 0;

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

function CustomDot(props: {
  cx?: number;
  cy?: number;
  payload?: ChartDataPoint;
  isSelected?: boolean;
}) {
  const { cx, cy, payload, isSelected } = props;
  if (!cx || !cy || !payload) return null;

  const isLucky = payload.diff > 0;
  const baseRadius =
    typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches
      ? MOBILE_DOT_RADIUS
      : DESKTOP_DOT_RADIUS;
  const radius = isSelected ? baseRadius + 2 : baseRadius;

  return (
    <circle
      cx={cx}
      cy={cy}
      r={radius}
      fill={isLucky ? "hsl(45, 93%, 47%)" : "hsl(142, 76%, 36%)"}
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
  const isLucky = data.diff > 0;

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
            <p className="font-semibold truncate">{data.name}</p>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>
                <span className="text-xs">Goals:</span>{" "}
                <span className="font-mono">{data.goals}</span>
              </span>
              <span>
                <span className="text-xs">xG:</span>{" "}
                <span className="font-mono">{data.expectedGoals.toFixed(1)}</span>
              </span>
              <span className={`font-mono font-semibold ${isLucky ? "text-warning" : "text-success"}`}>
                {isLucky ? "+" : ""}
                {data.diff.toFixed(1)}
              </span>
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

export function SkaterLuckChart({ entries }: SkaterLuckChartProps) {
  const navigate = useNavigate();
  const { selectedItem, handleSelect, clearSelection } =
    useChartSelection<ChartDataPoint>();

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
          <CardTitle>Goals vs Expected Goals</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

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

        <p className="text-center text-xs text-muted-foreground mt-3 sm:hidden">
          Tap a point to see player details
        </p>
      </CardContent>
    </Card>
  );
}
