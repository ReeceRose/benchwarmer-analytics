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
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TeamLogo } from "@/components/shared";
import { CHART_AXIS_COLOURS } from "@/lib/chart-colours";
import { getTeamLogoUrl } from "@/lib/team-logos";
import type { TeamPowerRanking } from "@/types";

interface LuckQuadrantChartProps {
  teams: TeamPowerRanking[];
  season?: number;
}

interface ChartDataPoint {
  abbrev: string;
  name: string;
  shootingPct: number;
  savePct: number;
  pdo: number;
}

// League average constants
const AVG_SHOOTING_PCT = 10.0;
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
  const isLucky = data.pdo > 100;

  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
      <div className="flex items-center gap-2 mb-2">
        <TeamLogo abbrev={data.abbrev} size="sm" />
        <span className="font-semibold">{data.name}</span>
      </div>
      <div className="space-y-1 text-xs">
        <p>
          <span className="text-muted-foreground">Shooting %:</span>{" "}
          <span className="font-mono">{data.shootingPct.toFixed(1)}%</span>
        </p>
        <p>
          <span className="text-muted-foreground">Save %:</span>{" "}
          <span className="font-mono">{data.savePct.toFixed(1)}%</span>
        </p>
        <p className={isLucky ? "text-warning" : "text-success"}>
          <span className="text-muted-foreground">PDO:</span>{" "}
          <span className="font-mono font-semibold">{data.pdo.toFixed(1)}</span>
          <span className="ml-1">({isLucky ? "Lucky" : "Unlucky"})</span>
        </p>
      </div>
    </div>
  );
}

// Custom dot to show team logo using native SVG image
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

export function LuckQuadrantChart({ teams, season }: LuckQuadrantChartProps) {
  const navigate = useNavigate();

  // Prepare chart data - filter out teams without Sh%/Sv% data
  const chartData: ChartDataPoint[] = teams
    .filter((t) => t.shootingPct != null && t.savePct != null)
    .map((team) => ({
      abbrev: team.abbreviation,
      name: team.name,
      shootingPct: team.shootingPct!,
      savePct: team.savePct!,
      pdo: team.pdo ?? (team.shootingPct! + team.savePct!),
    }));

  const handleClick = (data: ChartDataPoint) => {
    navigate({
      to: "/teams/$abbrev",
      params: { abbrev: data.abbrev },
      search: { season },
    });
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Luck Quadrant</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Calculate domain with padding
  const shPcts = chartData.map((d) => d.shootingPct);
  const svPcts = chartData.map((d) => d.savePct);
  const xMin = Math.floor(Math.min(...shPcts) - 1);
  const xMax = Math.ceil(Math.max(...shPcts) + 1);
  const yMin = Math.floor((Math.min(...svPcts) - 0.5) * 10) / 10;
  const yMax = Math.ceil((Math.max(...svPcts) + 0.5) * 10) / 10;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Luck Quadrant (Sh% vs Sv%)</CardTitle>
        <CardDescription>
          PDO components - teams in upper-right are "lucky", lower-left are "unlucky"
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
              x2={AVG_SHOOTING_PCT}
              y1={AVG_SAVE_PCT}
              y2={yMax}
              fill="hsl(217, 91%, 60%)"
              fillOpacity={0.08}
            />
            <ReferenceArea
              x1={AVG_SHOOTING_PCT}
              x2={xMax}
              y1={AVG_SAVE_PCT}
              y2={yMax}
              fill="hsl(45, 93%, 47%)"
              fillOpacity={0.08}
            />
            <ReferenceArea
              x1={xMin}
              x2={AVG_SHOOTING_PCT}
              y1={yMin}
              y2={AVG_SAVE_PCT}
              fill="hsl(142, 76%, 36%)"
              fillOpacity={0.08}
            />
            <ReferenceArea
              x1={AVG_SHOOTING_PCT}
              x2={xMax}
              y1={yMin}
              y2={AVG_SAVE_PCT}
              fill="hsl(0, 72%, 51%)"
              fillOpacity={0.08}
            />

            <XAxis
              type="number"
              dataKey="shootingPct"
              domain={[xMin, xMax]}
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            >
              <Label
                value="Shooting %"
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

            {/* Reference lines at league average */}
            <ReferenceLine
              x={AVG_SHOOTING_PCT}
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
          <div className="p-2 rounded" style={{ backgroundColor: "hsla(217, 91%, 60%, 0.15)" }}>
            <span className="font-medium">Good Defense</span>
            <p className="text-muted-foreground">High Sv%, Low Sh%</p>
          </div>
          <div className="p-2 rounded" style={{ backgroundColor: "hsla(45, 93%, 47%, 0.15)" }}>
            <span className="font-medium text-warning">Lucky</span>
            <p className="text-muted-foreground">High Sv%, High Sh%</p>
          </div>
          <div className="p-2 rounded" style={{ backgroundColor: "hsla(142, 76%, 36%, 0.15)" }}>
            <span className="font-medium text-success">Unlucky</span>
            <p className="text-muted-foreground">Low Sv%, Low Sh%</p>
          </div>
          <div className="p-2 rounded" style={{ backgroundColor: "hsla(0, 72%, 51%, 0.15)" }}>
            <span className="font-medium">Good Offense</span>
            <p className="text-muted-foreground">Low Sv%, High Sh%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
