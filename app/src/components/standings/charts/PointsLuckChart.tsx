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
import { Button } from "@/components/ui/button";
import { X, ExternalLink } from "lucide-react";
import { TeamLogo } from "@/components/shared";
import { CHART_AXIS_COLOURS } from "@/lib/chart-colours";
import { getTeamLogoUrl } from "@/lib/team-logos";
import { useChartSelection } from "@/hooks";
import type { StandingsWithAnalytics } from "@/types";

interface PointsLuckChartProps {
  teams: StandingsWithAnalytics[];
}

interface ChartDataPoint {
  abbrev: string;
  name: string;
  points: number;
  expectedPoints: number;
  diff: number;
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
  const isLucky = data.diff > 0;

  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
      <div className="flex items-center gap-2 mb-2">
        <TeamLogo abbrev={data.abbrev} size="sm" />
        <span className="font-semibold">{data.name}</span>
      </div>
      <div className="space-y-1 text-xs">
        <p>
          <span className="text-muted-foreground">Actual Points:</span>{" "}
          <span className="font-mono font-semibold">{data.points}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Expected Points:</span>{" "}
          <span className="font-mono">{data.expectedPoints.toFixed(1)}</span>
        </p>
        <p className={isLucky ? "text-warning" : "text-success"}>
          <span className="text-muted-foreground">Difference:</span>{" "}
          <span className="font-mono font-semibold">
            {isLucky ? "+" : ""}
            {data.diff.toFixed(1)}
          </span>
          <span className="ml-1">({isLucky ? "Lucky" : "Unlucky"})</span>
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

  const isMobile =
    typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  const size = isMobile ? MOBILE_SIZE : DESKTOP_SIZE;

  return (
    <g>
      <image
        href={getTeamLogoUrl(payload.abbrev)}
        x={cx - size}
        y={cy - size}
        width={size * 2}
        height={size * 2}
        style={{
          transition: "all 0.15s",
          filter: isSelected ? "drop-shadow(0 0 4px hsl(var(--primary)))" : undefined,
        }}
      />
      {isSelected && (
        <circle
          cx={cx}
          cy={cy}
          r={size + 3}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
        />
      )}
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
  const isLucky = data.diff > 0;

  return (
    <div className="mt-3 p-3 border rounded-lg bg-muted/30 animate-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <TeamLogo abbrev={data.abbrev} size="md" />
          <div className="min-w-0">
            <p className="font-semibold truncate">
              {data.name}
              <span
                className={`ml-2 text-xs ${isLucky ? "text-warning" : "text-success"}`}
              >
                {isLucky ? "Lucky" : "Unlucky"}
              </span>
            </p>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>
                <span className="text-xs">Pts:</span>{" "}
                <span className="font-mono font-semibold">{data.points}</span>
              </span>
              <span>
                <span className="text-xs">xPts:</span>{" "}
                <span className="font-mono">{data.expectedPoints.toFixed(1)}</span>
              </span>
              <span
                className={`font-mono font-semibold ${isLucky ? "text-warning" : "text-success"}`}
              >
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

export function PointsLuckChart({ teams }: PointsLuckChartProps) {
  const navigate = useNavigate();
  const { selectedItem, handleSelect, clearSelection } =
    useChartSelection<ChartDataPoint>();

  // Prepare chart data - only teams with analytics
  const chartData: ChartDataPoint[] = teams
    .filter((t) => t.analytics?.expectedPoints != null)
    .map((team) => ({
      abbrev: team.abbreviation,
      name: team.name,
      points: team.points,
      expectedPoints: team.analytics!.expectedPoints,
      diff: team.analytics!.pointsDiff,
    }));

  const handleClick = (data: ChartDataPoint) => {
    if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) {
      handleSelect(data);
    } else {
      navigate({
        to: "/teams/$abbrev",
        params: { abbrev: data.abbrev },
      });
    }
  };

  const handleNavigateToTeam = () => {
    if (selectedItem) {
      navigate({
        to: "/teams/$abbrev",
        params: { abbrev: selectedItem.abbrev },
      });
    }
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Points Luck</CardTitle>
          <CardDescription>No analytics data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Calculate domain with padding
  const allPoints = chartData.flatMap((d) => [d.points, d.expectedPoints]);
  const minPts = Math.floor(Math.min(...allPoints) / 5) * 5 - 5;
  const maxPts = Math.ceil(Math.max(...allPoints) / 5) * 5 + 5;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Expected vs Actual Points</CardTitle>
        <CardDescription>
          Teams above the line are "lucky" (overperforming), below are "unlucky"
          (underperforming)
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
              dataKey="expectedPoints"
              domain={[minPts, maxPts]}
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            >
              <Label
                value="Expected Points (xPts)"
                position="bottom"
                offset={15}
                style={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 12 }}
              />
            </XAxis>
            <YAxis
              type="number"
              dataKey="points"
              domain={[minPts, maxPts]}
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            >
              <Label
                value="Actual Points"
                angle={-90}
                position="insideLeft"
                offset={10}
                style={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 12 }}
              />
            </YAxis>

            <ReferenceLine
              segment={[
                { x: minPts, y: minPts },
                { x: maxPts, y: maxPts },
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
                  isSelected={selectedItem?.abbrev === props.payload?.abbrev}
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
            onNavigate={handleNavigateToTeam}
          />
        )}

        <div className="flex justify-center gap-8 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">
              Above line = Lucky (overperforming)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">
              Below line = Unlucky (underperforming)
            </span>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-3 sm:hidden">
          Tap a team to see details
        </p>
      </CardContent>
    </Card>
  );
}
