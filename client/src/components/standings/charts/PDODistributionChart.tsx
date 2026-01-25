import { useNavigate } from "@tanstack/react-router";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
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

interface PDODistributionChartProps {
  teams: StandingsWithAnalytics[];
}

interface ChartDataPoint {
  abbrev: string;
  name: string;
  pdo: number;
  shootingPct: number;
  savePct: number;
  yPos: number; // For vertical spread
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
  const isLucky = data.pdo > 100;
  const deviation = Math.abs(data.pdo - 100);
  const isExtreme = deviation > 3;

  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
      <div className="flex items-center gap-2 mb-2">
        <TeamLogo abbrev={data.abbrev} size="sm" />
        <span className="font-semibold">{data.name}</span>
      </div>
      <div className="space-y-1 text-xs">
        <p className={isLucky ? "text-warning" : "text-success"}>
          <span className="text-muted-foreground">PDO:</span>{" "}
          <span className="font-mono font-semibold">{data.pdo.toFixed(1)}</span>
          <span className="ml-1">
            ({isLucky ? "Lucky" : "Unlucky"}
            {isExtreme ? " - Extreme" : ""})
          </span>
        </p>
        <p>
          <span className="text-muted-foreground">Shooting %:</span>{" "}
          <span className="font-mono">{data.shootingPct.toFixed(1)}%</span>
        </p>
        <p>
          <span className="text-muted-foreground">Save %:</span>{" "}
          <span className="font-mono">{data.savePct.toFixed(1)}%</span>
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
        x={cx - 14}
        y={cy - 14}
        width={28}
        height={28}
      />
    </g>
  );
}

export function PDODistributionChart({ teams }: PDODistributionChartProps) {
  const navigate = useNavigate();

  // Filter to teams with PDO data and sort by PDO
  const teamsWithPDO = teams
    .filter((t) => t.analytics?.pdo != null)
    .sort((a, b) => (b.analytics?.pdo ?? 0) - (a.analytics?.pdo ?? 0));

  // Create chart data with vertical spread
  const chartData: ChartDataPoint[] = teamsWithPDO.map((team, index) => ({
    abbrev: team.abbreviation,
    name: team.name,
    pdo: team.analytics!.pdo!,
    shootingPct: team.analytics!.shootingPct ?? 0,
    savePct: team.analytics!.savePct ?? 0,
    yPos: index,
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
          <CardTitle>PDO Distribution</CardTitle>
          <CardDescription>No PDO data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Calculate domain
  const pdoValues = chartData.map((d) => d.pdo);
  const minPDO = Math.floor(Math.min(...pdoValues) * 10) / 10 - 1;
  const maxPDO = Math.ceil(Math.max(...pdoValues) * 10) / 10 + 1;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">
          PDO Distribution (Luck Indicator)
        </CardTitle>
        <CardDescription>
          PDO = Sh% + Sv% — values near 100 are sustainable, extremes regress to
          mean
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={500}>
          <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 30 }}>
            <XAxis
              type="number"
              dataKey="pdo"
              domain={[minPDO, maxPDO]}
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            >
              <Label
                value="PDO (Shooting % + Save %)"
                position="bottom"
                offset={15}
                style={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 12 }}
              />
            </XAxis>
            <YAxis
              type="number"
              dataKey="yPos"
              domain={[-1, chartData.length]}
              hide
            />

            <ReferenceLine
              x={100}
              stroke={CHART_AXIS_COLOURS.reference}
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: "League Avg (100)",
                position: "top",
                fill: CHART_AXIS_COLOURS.tick,
                fontSize: 11,
              }}
            />

            <ReferenceLine
              x={97}
              stroke="hsl(142, 76%, 36%)"
              strokeDasharray="3 3"
              strokeWidth={1}
              strokeOpacity={0.5}
            />
            <ReferenceLine
              x={103}
              stroke="hsl(45, 93%, 47%)"
              strokeDasharray="3 3"
              strokeWidth={1}
              strokeOpacity={0.5}
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
        <div className="flex justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded"
              style={{ backgroundColor: "hsl(142, 76%, 36%)" }}
            />
            <span className="text-muted-foreground">
              {"< 97: Unlucky (likely to improve)"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-muted-foreground" />
            <span className="text-muted-foreground">97-103: Sustainable</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded"
              style={{ backgroundColor: "hsl(45, 93%, 47%)" }}
            />
            <span className="text-muted-foreground">
              {"> 103: Lucky (likely to regress)"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
