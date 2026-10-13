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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TeamLogo } from "@/components/shared";
import { CHART_AXIS_COLOURS } from "@/lib/chart-colours";
import { getTeamLogoUrl } from "@/lib/team-logos";
import type { TeamPowerRanking } from "@/types";

interface TeamRankingBarsProps {
  teams: TeamPowerRanking[];
  season?: number;
}

interface ChartDataPoint {
  abbrev: string;
  name: string;
  pointsPct: number;
  rank: number;
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
          <span className="text-muted-foreground">Points %:</span>{" "}
          <span className="tabular-nums font-semibold">{(data.pointsPct * 100).toFixed(1)}%</span>
        </p>
      </div>
    </div>
  );
}

export function TeamRankingBars({ teams, season }: TeamRankingBarsProps) {
  const navigate = useNavigate();

  // Sort by points percentage and prepare chart data
  const sortedTeams = [...teams].sort((a, b) => {
    const aPct = a.gamesPlayed > 0 ? a.points / (a.gamesPlayed * 2) : 0;
    const bPct = b.gamesPlayed > 0 ? b.points / (b.gamesPlayed * 2) : 0;
    return bPct - aPct;
  });

  const chartData: ChartDataPoint[] = sortedTeams.map((team, index) => ({
    abbrev: team.abbreviation,
    name: team.name,
    pointsPct: team.gamesPlayed > 0 ? team.points / (team.gamesPlayed * 2) : 0,
    rank: index + 1,
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
          <CardTitle>Team rankings</CardTitle>
          <CardDescription>No data for this selection yet</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Team rankings by points %</CardTitle>
        <CardDescription>
          Click any team to view their details
        </CardDescription>
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
              domain={[0, 1]}
              tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
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
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--muted)", fillOpacity: 0.5 }} />
            <Bar
              dataKey="pointsPct"
              radius={4}
              cursor="pointer"
              onClick={(data) => handleClick(data as unknown as ChartDataPoint)}
            >
              {chartData.map((entry) => (
                <Cell
                  key={`cell-${entry.abbrev}`}
                  fill="var(--chart-1)"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
