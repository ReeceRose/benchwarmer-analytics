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
import { TeamLogo } from "@/components/shared";
import { CHART_AXIS_COLOURS } from "@/lib/chart-colours";
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

// League average constants
const AVG_GSAX = 0;
const AVG_SAVE_PCT = 90.5;

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
  const isElite = data.gsax > 0 && data.savePct > AVG_SAVE_PCT;

  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
      <div className="flex items-center gap-2 mb-2">
        <TeamLogo abbrev={data.team} size="sm" />
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

// Custom dot with size based on games played
function CustomDot(props: {
  cx?: number;
  cy?: number;
  payload?: ChartDataPoint;
}) {
  const { cx, cy, payload } = props;
  if (!cx || !cy || !payload) return null;

  // Size based on games played (min 4, max 12)
  const size = Math.max(4, Math.min(12, 4 + payload.gamesPlayed / 8));
  const isPositiveGSAx = payload.gsax > 0;

  return (
    <circle
      cx={cx}
      cy={cy}
      r={size}
      fill={isPositiveGSAx ? "hsl(142, 76%, 36%)" : "hsl(0, 72%, 51%)"}
      fillOpacity={0.7}
      stroke="hsl(var(--background))"
      strokeWidth={1.5}
    />
  );
}

export function GoalieQuadrantChart({
  entries,
}: GoalieQuadrantChartProps) {
  const navigate = useNavigate();

  // Filter to goalies with GSAx and Sv% data
  const chartData: ChartDataPoint[] = entries
    .filter(
      (e) =>
        e.goalsSavedAboveExpected != null &&
        e.savePercentage != null &&
        e.gamesPlayed >= 5,
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
    navigate({
      to: "/players/$id",
      params: { id: String(data.playerId) },
    });
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

  // Calculate domain
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

            {/* Quadrant shading */}
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

            {/* Reference lines at averages */}
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
              shape={<CustomDot />}
              cursor="pointer"
              onClick={(data) => handleClick(data as unknown as ChartDataPoint)}
            />
          </ScatterChart>
        </ResponsiveContainer>
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
      </CardContent>
    </Card>
  );
}
