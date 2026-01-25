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
import { getTeamLogoUrl } from "@/lib/team-logos";
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

// Custom dot showing team logo
function CustomDot(props: {
  cx?: number;
  cy?: number;
  payload?: ChartDataPoint;
}) {
  const { cx, cy, payload } = props;
  if (!cx || !cy || !payload) return null;

  return (
    <g>
      <image
        href={getTeamLogoUrl(payload.abbrev)}
        x={cx - 12}
        y={cy - 12}
        width={24}
        height={24}
      />
    </g>
  );
}

export function PointsLuckChart({ teams }: PointsLuckChartProps) {
  const navigate = useNavigate();

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
    navigate({
      to: "/teams/$abbrev",
      params: { abbrev: data.abbrev },
    });
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
              shape={<CustomDot />}
              cursor="pointer"
              onClick={(data) => handleClick(data as unknown as ChartDataPoint)}
            />
          </ScatterChart>
        </ResponsiveContainer>
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
      </CardContent>
    </Card>
  );
}
