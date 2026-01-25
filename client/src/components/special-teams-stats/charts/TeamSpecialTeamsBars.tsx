import { useNavigate } from "@tanstack/react-router";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
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

interface TeamSpecialTeamsBarsProps {
  teams: TeamSpecialTeamsRanking[];
  metric: "pp" | "pk";
  season?: number;
}

interface ChartDataPoint {
  abbrev: string;
  name: string;
  value: number;
  rank: number;
}

// Generate gradient color based on rank (1-32)
function getRankColor(rank: number, total: number): string {
  const ratio = (rank - 1) / (total - 1);

  if (ratio < 0.25) {
    return "hsl(142, 76%, 36%)"; // green-600 (top 8)
  } else if (ratio < 0.5) {
    return "hsl(217, 91%, 60%)"; // blue-500 (9-16)
  } else if (ratio < 0.75) {
    return "hsl(45, 93%, 47%)"; // amber-500 (17-24)
  } else {
    return "hsl(0, 72%, 51%)"; // red-600 (25-32)
  }
}

// Custom Y-axis tick with team logo
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

// Custom tooltip
function CustomTooltip({
  active,
  payload,
  metric,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
  metric: "pp" | "pk";
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const label = metric === "pp" ? "Power Play %" : "Penalty Kill %";

  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
      <div className="flex items-center gap-2 mb-2">
        <TeamLogo abbrev={data.abbrev} size="sm" />
        <span className="font-semibold">{data.name}</span>
      </div>
      <div className="space-y-1">
        <p>
          <span className="text-muted-foreground">Rank:</span>{" "}
          <span className="font-mono font-semibold">#{data.rank}</span>
        </p>
        <p>
          <span className="text-muted-foreground">{label}:</span>{" "}
          <span className="font-mono font-semibold">{data.value.toFixed(1)}%</span>
        </p>
      </div>
    </div>
  );
}

export function TeamSpecialTeamsBars({
  teams,
  metric,
  season,
}: TeamSpecialTeamsBarsProps) {
  const navigate = useNavigate();

  // Sort by selected metric and prepare chart data
  const sortedTeams = [...teams].sort((a, b) => {
    const aVal = metric === "pp" ? a.ppPct : a.pkPct;
    const bVal = metric === "pp" ? b.ppPct : b.pkPct;
    return bVal - aVal;
  });

  const chartData: ChartDataPoint[] = sortedTeams.map((team, index) => ({
    abbrev: team.teamAbbreviation,
    name: team.teamName,
    value: metric === "pp" ? team.ppPct : team.pkPct,
    rank: index + 1,
  }));

  const handleClick = (data: ChartDataPoint) => {
    navigate({
      to: "/teams/$abbrev/special-teams",
      params: { abbrev: data.abbrev },
      search: { season },
    });
  };

  const title = metric === "pp" ? "Power Play %" : "Penalty Kill %";
  const description =
    metric === "pp"
      ? "Teams ranked by power play success rate"
      : "Teams ranked by penalty kill success rate";

  if (teams.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Calculate domain for x-axis (percentages)
  const values = chartData.map((d) => d.value);
  const minVal = Math.floor(Math.min(...values) - 2);
  const maxVal = Math.ceil(Math.max(...values) + 2);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={1200}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
          >
            <XAxis
              type="number"
              domain={[minVal, maxVal]}
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
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
              content={<CustomTooltip metric={metric} />}
              cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.5 }}
            />
            <Bar
              dataKey="value"
              radius={[0, 4, 4, 0]}
              cursor="pointer"
              onClick={(data) => handleClick(data as unknown as ChartDataPoint)}
            >
              {chartData.map((entry) => (
                <Cell
                  key={`cell-${entry.abbrev}`}
                  fill={getRankColor(entry.rank, chartData.length)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-6 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded"
              style={{ backgroundColor: "hsl(142, 76%, 36%)" }}
            />
            <span>Top 8</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded"
              style={{ backgroundColor: "hsl(217, 91%, 60%)" }}
            />
            <span>9-16</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded"
              style={{ backgroundColor: "hsl(45, 93%, 47%)" }}
            />
            <span>17-24</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded"
              style={{ backgroundColor: "hsl(0, 72%, 51%)" }}
            />
            <span>25-32</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
