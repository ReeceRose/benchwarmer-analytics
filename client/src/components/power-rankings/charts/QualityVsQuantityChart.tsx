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

interface QualityVsQuantityChartProps {
  teams: TeamPowerRanking[];
  season?: number;
}

interface ChartDataPoint {
  abbrev: string;
  name: string;
  corsiPct: number;
  xGoalsPct: number;
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
  const isGoodQuality = data.xGoalsPct > 50;
  const isGoodQuantity = data.corsiPct > 50;

  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
      <div className="flex items-center gap-2 mb-2">
        <TeamLogo abbrev={data.abbrev} size="sm" />
        <span className="font-semibold">{data.name}</span>
      </div>
      <div className="space-y-1 text-xs">
        <p>
          <span className="text-muted-foreground">CF% (Quantity):</span>{" "}
          <span className={`font-mono ${isGoodQuantity ? "text-success" : "text-error"}`}>
            {data.corsiPct.toFixed(1)}%
          </span>
        </p>
        <p>
          <span className="text-muted-foreground">xG% (Quality):</span>{" "}
          <span className={`font-mono ${isGoodQuality ? "text-success" : "text-error"}`}>
            {data.xGoalsPct.toFixed(1)}%
          </span>
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

export function QualityVsQuantityChart({ teams, season }: QualityVsQuantityChartProps) {
  const navigate = useNavigate();

  // Prepare chart data - filter out teams without CF%/xG% data
  const chartData: ChartDataPoint[] = teams
    .filter((t) => t.corsiPct != null && t.xGoalsPct != null)
    .map((team) => ({
      abbrev: team.abbreviation,
      name: team.name,
      corsiPct: (team.corsiPct ?? 0) * 100,
      xGoalsPct: (team.xGoalsPct ?? 0) * 100,
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
          <CardTitle>Quality vs Quantity</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Calculate domain with padding
  const cfPcts = chartData.map((d) => d.corsiPct);
  const xgPcts = chartData.map((d) => d.xGoalsPct);
  const xMin = Math.floor(Math.min(...cfPcts) - 1);
  const xMax = Math.ceil(Math.max(...cfPcts) + 1);
  const yMin = Math.floor(Math.min(...xgPcts) - 1);
  const yMax = Math.ceil(Math.max(...xgPcts) + 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Quality vs Quantity of Chances</CardTitle>
        <CardDescription>
          xG% (quality) vs CF% (volume) - top-right is dominant, bottom-left is struggling
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
              x2={50}
              y1={50}
              y2={yMax}
              fill="hsl(217, 91%, 60%)"
              fillOpacity={0.08}
            />
            <ReferenceArea
              x1={50}
              x2={xMax}
              y1={50}
              y2={yMax}
              fill="hsl(142, 76%, 36%)"
              fillOpacity={0.08}
            />
            <ReferenceArea
              x1={xMin}
              x2={50}
              y1={yMin}
              y2={50}
              fill="hsl(0, 72%, 51%)"
              fillOpacity={0.08}
            />
            <ReferenceArea
              x1={50}
              x2={xMax}
              y1={yMin}
              y2={50}
              fill="hsl(45, 93%, 47%)"
              fillOpacity={0.08}
            />

            <XAxis
              type="number"
              dataKey="corsiPct"
              domain={[xMin, xMax]}
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            >
              <Label
                value="Corsi For % (Shot Attempt Share)"
                position="bottom"
                offset={15}
                style={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 12 }}
              />
            </XAxis>
            <YAxis
              type="number"
              dataKey="xGoalsPct"
              domain={[yMin, yMax]}
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            >
              <Label
                value="Expected Goals %"
                angle={-90}
                position="insideLeft"
                offset={10}
                style={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 12 }}
              />
            </YAxis>

            {/* Reference lines at 50% */}
            <ReferenceLine
              x={50}
              stroke={CHART_AXIS_COLOURS.reference}
              strokeDasharray="5 5"
              strokeWidth={1.5}
            />
            <ReferenceLine
              y={50}
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
            <span className="font-medium">Quality over Volume</span>
            <p className="text-muted-foreground">High xG%, Low CF%</p>
          </div>
          <div className="p-2 rounded" style={{ backgroundColor: "hsla(142, 76%, 36%, 0.15)" }}>
            <span className="font-medium text-success">Dominant</span>
            <p className="text-muted-foreground">High xG%, High CF%</p>
          </div>
          <div className="p-2 rounded" style={{ backgroundColor: "hsla(0, 72%, 51%, 0.15)" }}>
            <span className="font-medium text-error">Struggling</span>
            <p className="text-muted-foreground">Low xG%, Low CF%</p>
          </div>
          <div className="p-2 rounded" style={{ backgroundColor: "hsla(45, 93%, 47%, 0.15)" }}>
            <span className="font-medium">Volume over Quality</span>
            <p className="text-muted-foreground">Low xG%, High CF%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
