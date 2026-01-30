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
import type { Rookie } from "@/types";

interface GoalsVsExpectedChartProps {
  rookies: Rookie[];
}

interface ChartDataPoint {
  playerId: number;
  name: string;
  team: string;
  goals: number;
  expectedGoals: number;
  diff: number;
  points: number;
}

const MOBILE_SIZE = 16;
const DESKTOP_SIZE = 12;

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
        <p className={isOverperforming ? "text-success" : "text-amber-500"}>
          <span className="text-muted-foreground">G - xG:</span>{" "}
          <span className="font-mono font-semibold">
            {isOverperforming ? "+" : ""}
            {data.diff.toFixed(1)}
          </span>
          <span className="ml-1">
            ({isOverperforming ? "Hot" : "Due for more"})
          </span>
        </p>
        <p>
          <span className="text-muted-foreground">Total Points:</span>{" "}
          <span className="font-mono">{data.points}</span>
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

  const isOverperforming = payload.diff > 0;
  const isMobile =
    typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  const size = isMobile ? MOBILE_SIZE : DESKTOP_SIZE;

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
            border: isSelected
              ? "3px solid hsl(var(--primary))"
              : `2px solid ${isOverperforming ? "hsl(142, 76%, 36%)" : "hsl(45, 93%, 47%)"}`,
            transition: "border 0.15s",
          }}
        />
      </foreignObject>
    </g>
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
  const isOverperforming = data.diff > 0;

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
              <span
                className={`ml-2 text-xs ${isOverperforming ? "text-success" : "text-amber-500"}`}
              >
                {isOverperforming ? "Hot" : "Due for more"}
              </span>
            </p>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>
                <span className="text-xs">Goals:</span>{" "}
                <span className="font-mono">{data.goals}</span>
              </span>
              <span>
                <span className="text-xs">xG:</span>{" "}
                <span className="font-mono">{data.expectedGoals.toFixed(1)}</span>
              </span>
              <span
                className={`font-mono font-semibold ${isOverperforming ? "text-success" : "text-amber-500"}`}
              >
                {isOverperforming ? "+" : ""}
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

export function GoalsVsExpectedChart({ rookies }: GoalsVsExpectedChartProps) {
  const navigate = useNavigate();
  const { selectedItem, handleSelect, clearSelection } =
    useChartSelection<ChartDataPoint>();

  const chartData: ChartDataPoint[] = rookies
    .filter((r) => r.expectedGoals > 0)
    .map((rookie) => ({
      playerId: rookie.playerId,
      name: rookie.name,
      team: rookie.team,
      goals: rookie.goals,
      expectedGoals: rookie.expectedGoals,
      diff: rookie.goalsDifferential,
      points: rookie.points,
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
          <CardTitle>Goals vs Expected</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const allValues = chartData.flatMap((d) => [d.goals, d.expectedGoals]);
  const minVal = Math.floor(Math.min(...allValues)) - 1;
  const maxVal = Math.ceil(Math.max(...allValues)) + 1;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Goals vs Expected Goals</CardTitle>
        <CardDescription>
          Rookies above the line are outperforming expectations
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
              className="w-3 h-3 rounded-full border-2"
              style={{ borderColor: "hsl(142, 76%, 36%)" }}
            />
            <span className="text-muted-foreground">
              Above line = Outperforming (hot)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full border-2"
              style={{ borderColor: "hsl(45, 93%, 47%)" }}
            />
            <span className="text-muted-foreground">
              Below line = Due for more goals
            </span>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-3 sm:hidden">
          Tap a rookie to see details
        </p>
      </CardContent>
    </Card>
  );
}
