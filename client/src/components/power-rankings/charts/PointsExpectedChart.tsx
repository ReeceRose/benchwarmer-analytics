import { useNavigate } from "@tanstack/react-router";
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Scatter,
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
import type { TeamPowerRanking } from "@/types";

interface PointsExpectedChartProps {
  teams: TeamPowerRanking[];
  season?: number;
}

interface ChartDataPoint {
  abbrev: string;
  name: string;
  points: number;
  expectedPoints: number;
  diff: number;
  // For the connecting line
  lineStart: number;
  lineEnd: number;
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
  const isOver = data.diff > 0;

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
          <span className="font-mono">{data.expectedPoints}</span>
        </p>
        <p className={isOver ? "text-warning" : "text-success"}>
          <span className="text-muted-foreground">Difference:</span>{" "}
          <span className="font-mono font-semibold">
            {isOver ? "+" : ""}
            {data.diff}
          </span>
          <span className="ml-1">
            ({isOver ? "Overperforming" : "Underperforming"})
          </span>
        </p>
      </div>
    </div>
  );
}

// Custom Y-axis tick with team logo using native SVG image
function CustomYAxisTick({
  x,
  y,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value: string };
}) {
  if (!payload?.value || x === undefined || y === undefined) return null;

  return (
    <g transform={`translate(${x},${y})`}>
      <image
        href={getTeamLogoUrl(payload.value)}
        x={-32}
        y={-14}
        width={28}
        height={28}
      />
    </g>
  );
}

// Expected points dot (hollow circle)
function ExpectedPointsDot(props: { cx?: number; cy?: number }) {
  const { cx, cy } = props;
  if (!cx || !cy) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill="hsl(var(--background))"
      stroke={CHART_AXIS_COLOURS.tick}
      strokeWidth={2}
    />
  );
}

// Actual points dot (filled circle with color based on performance)
function ActualPointsDot(props: {
  cx?: number;
  cy?: number;
  payload?: ChartDataPoint;
  onClick?: (data: ChartDataPoint) => void;
}) {
  const { cx, cy, payload, onClick } = props;
  if (!cx || !cy || !payload) return null;
  const isOver = payload.diff > 0;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={6}
      fill={isOver ? "hsl(45, 93%, 47%)" : "hsl(142, 76%, 36%)"}
      stroke="hsl(var(--background))"
      strokeWidth={2}
      cursor="pointer"
      onClick={() => onClick?.(payload)}
    />
  );
}

export function PointsExpectedChart({
  teams,
  season,
}: PointsExpectedChartProps) {
  const navigate = useNavigate();

  // Sort by points differential (biggest overperformers at top)
  const sortedTeams = [...teams].sort((a, b) => b.pointsDiff - a.pointsDiff);

  const chartData: ChartDataPoint[] = sortedTeams.map((team) => ({
    abbrev: team.abbreviation,
    name: team.name,
    points: team.points,
    expectedPoints: team.expectedPoints,
    diff: team.pointsDiff,
    lineStart: Math.min(team.points, team.expectedPoints),
    lineEnd: Math.max(team.points, team.expectedPoints),
  }));

  const handleClick = (data: ChartDataPoint) => {
    navigate({
      to: "/teams/$abbrev",
      params: { abbrev: data.abbrev },
      search: { season },
    });
  };

  if (teams.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Expected vs Actual Points</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Calculate domain
  const allPoints = chartData.flatMap((d) => [d.points, d.expectedPoints]);
  const minPts = Math.floor(Math.min(...allPoints) / 5) * 5 - 5;
  const maxPts = Math.ceil(Math.max(...allPoints) / 5) * 5 + 5;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Expected vs Actual Points</CardTitle>
        <CardDescription>
          Sorted by differential - overperformers at top, underperformers at
          bottom
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={1200}>
          <ComposedChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
          >
            <XAxis
              type="number"
              domain={[minPts, maxPts]}
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="abbrev"
              tick={<CustomYAxisTick />}
              width={45}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.5 }}
            />

            <Bar
              dataKey="lineEnd"
              stackId="dumbbell"
              fill="transparent"
              barSize={4}
            />
            {chartData.map((entry) => (
              <ReferenceLine
                key={entry.abbrev}
                segment={[
                  { x: entry.expectedPoints, y: entry.abbrev },
                  { x: entry.points, y: entry.abbrev },
                ]}
                stroke={
                  entry.diff > 0 ? "hsl(45, 93%, 47%)" : "hsl(142, 76%, 36%)"
                }
                strokeWidth={3}
                strokeOpacity={0.6}
              />
            ))}

            <Scatter dataKey="expectedPoints" shape={<ExpectedPointsDot />} />

            <Scatter
              dataKey="points"
              shape={<ActualPointsDot onClick={handleClick} />}
            />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-8 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full border-2"
              style={{ borderColor: CHART_AXIS_COLOURS.tick }}
            />
            <span className="text-muted-foreground">Expected Points</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: "hsl(45, 93%, 47%)" }}
            />
            <span className="text-muted-foreground">
              Actual (Overperforming)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: "hsl(142, 76%, 36%)" }}
            />
            <span className="text-muted-foreground">
              Actual (Underperforming)
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
