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
import type { TeamSpecialTeamsRanking } from "@/types";

interface PPvsPKScatterProps {
  teams: TeamSpecialTeamsRanking[];
  season?: number;
}

interface ChartDataPoint {
  abbrev: string;
  name: string;
  ppPct: number;
  pkPct: number;
  combined: number;
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

  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
      <div className="flex items-center gap-2 mb-2">
        <TeamLogo abbrev={data.abbrev} size="sm" />
        <span className="font-semibold">{data.name}</span>
      </div>
      <div className="space-y-1 text-xs">
        <p>
          <span className="text-muted-foreground">PP%:</span>{" "}
          <span className="font-mono">{data.ppPct.toFixed(1)}%</span>
        </p>
        <p>
          <span className="text-muted-foreground">PK%:</span>{" "}
          <span className="font-mono">{data.pkPct.toFixed(1)}%</span>
        </p>
        <p>
          <span className="text-muted-foreground">Combined:</span>{" "}
          <span className="font-mono font-semibold">
            {data.combined.toFixed(1)}%
          </span>
        </p>
      </div>
    </div>
  );
}

// Custom dot to show team logo
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

export function PPvsPKScatter({ teams, season }: PPvsPKScatterProps) {
  const navigate = useNavigate();

  const chartData: ChartDataPoint[] = teams.map((team) => ({
    abbrev: team.teamAbbreviation,
    name: team.teamName,
    ppPct: team.ppPct,
    pkPct: team.pkPct,
    combined: team.specialTeamsPct,
  }));

  const handleClick = (data: ChartDataPoint) => {
    navigate({
      to: "/teams/$abbrev/special-teams",
      params: { abbrev: data.abbrev },
      search: { season },
    });
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>PP% vs PK%</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Calculate averages for reference lines
  const avgPP =
    chartData.reduce((sum, d) => sum + d.ppPct, 0) / chartData.length;
  const avgPK =
    chartData.reduce((sum, d) => sum + d.pkPct, 0) / chartData.length;

  // Calculate domain with padding
  const ppPcts = chartData.map((d) => d.ppPct);
  const pkPcts = chartData.map((d) => d.pkPct);
  const xMin = Math.floor(Math.min(...ppPcts) - 2);
  const xMax = Math.ceil(Math.max(...ppPcts) + 2);
  const yMin = Math.floor(Math.min(...pkPcts) - 2);
  const yMax = Math.ceil(Math.max(...pkPcts) + 2);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">PP% vs PK%</CardTitle>
        <CardDescription>
          Teams in upper-right excel at both special teams
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

            <ReferenceArea
              x1={xMin}
              x2={avgPP}
              y1={avgPK}
              y2={yMax}
              fill="hsl(217, 91%, 60%)"
              fillOpacity={0.08}
            />
            <ReferenceArea
              x1={avgPP}
              x2={xMax}
              y1={avgPK}
              y2={yMax}
              fill="hsl(142, 76%, 36%)"
              fillOpacity={0.08}
            />
            <ReferenceArea
              x1={xMin}
              x2={avgPP}
              y1={yMin}
              y2={avgPK}
              fill="hsl(0, 72%, 51%)"
              fillOpacity={0.08}
            />
            <ReferenceArea
              x1={avgPP}
              x2={xMax}
              y1={yMin}
              y2={avgPK}
              fill="hsl(45, 93%, 47%)"
              fillOpacity={0.08}
            />

            <XAxis
              type="number"
              dataKey="ppPct"
              domain={[xMin, xMax]}
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            >
              <Label
                value="Power Play %"
                position="bottom"
                offset={15}
                style={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 12 }}
              />
            </XAxis>
            <YAxis
              type="number"
              dataKey="pkPct"
              domain={[yMin, yMax]}
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            >
              <Label
                value="Penalty Kill %"
                angle={-90}
                position="insideLeft"
                offset={10}
                style={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 12 }}
              />
            </YAxis>

            <ReferenceLine
              x={avgPP}
              stroke={CHART_AXIS_COLOURS.reference}
              strokeDasharray="5 5"
              strokeWidth={1.5}
            />
            <ReferenceLine
              y={avgPK}
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
            <span className="font-medium">Good PK Only</span>
            <p className="text-muted-foreground">High PK%, Below Avg PP%</p>
          </div>
          <div
            className="p-2 rounded"
            style={{ backgroundColor: "hsla(142, 76%, 36%, 0.15)" }}
          >
            <span className="font-medium text-success">Elite Special Teams</span>
            <p className="text-muted-foreground">High PP% & PK%</p>
          </div>
          <div
            className="p-2 rounded"
            style={{ backgroundColor: "hsla(0, 72%, 51%, 0.15)" }}
          >
            <span className="font-medium text-destructive">Poor Special Teams</span>
            <p className="text-muted-foreground">Below Avg PP% & PK%</p>
          </div>
          <div
            className="p-2 rounded"
            style={{ backgroundColor: "hsla(45, 93%, 47%, 0.15)" }}
          >
            <span className="font-medium">Good PP Only</span>
            <p className="text-muted-foreground">High PP%, Below Avg PK%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
