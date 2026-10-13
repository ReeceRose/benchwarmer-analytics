import { useNavigate } from "@tanstack/react-router";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
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
    <div className="rounded-xl border bg-popover text-popover-foreground shadow-lg shadow-black/5 p-3 text-sm">
      <div className="flex items-center gap-2 mb-2">
        <TeamLogo abbrev={data.abbrev} size="sm" />
        <span className="font-semibold">{data.name}</span>
      </div>
      <div className="space-y-1">
        <p>
          <span className="text-muted-foreground">Rank:</span>{" "}
          <span className="tabular-nums font-semibold">#{data.rank}</span>
        </p>
        <p>
          <span className="text-muted-foreground">{label}:</span>{" "}
          <span className="tabular-nums font-semibold">
            {data.value.toFixed(1)}%
          </span>
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
          <CardDescription>No data for this selection yet</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Bars start at zero so their lengths stay honest; the line marks the league average.
  const values = chartData.map((d) => d.value);
  const maxVal = Math.ceil(Math.max(...values) / 10) * 10;
  const average = values.reduce((sum, v) => sum + v, 0) / values.length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
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
              domain={[0, maxVal]}
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
              cursor={{ fill: "var(--muted)", fillOpacity: 0.5 }}
            />
            <Bar
              dataKey="value"
              radius={4}
              cursor="pointer"
              onClick={(data) => handleClick(data as unknown as ChartDataPoint)}
            >
              {chartData.map((entry) => (
                <Cell
                  key={`cell-${entry.abbrev}`}
                  fill="var(--chart-1)"
                  fillOpacity={entry.value >= average ? 0.9 : 0.45}
                />
              ))}
            </Bar>
            <ReferenceLine
              x={average}
              stroke={CHART_AXIS_COLOURS.reference}
              strokeDasharray="4 3"
            />
          </BarChart>
        </ResponsiveContainer>
        <p className="mt-3 text-xs text-muted-foreground tabular-nums">
          Dashed line: league average ({average.toFixed(1)}%). Faded bars are
          below it.
        </p>
      </CardContent>
    </Card>
  );
}
