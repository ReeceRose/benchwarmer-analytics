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

// Generate gradient color based on rank (1-32)
function getRankColor(rank: number, total: number): string {
  // Top teams: blue/green, bottom teams: red/orange
  const ratio = (rank - 1) / (total - 1);

  if (ratio < 0.25) {
    // Top 8: Success green
    return "hsl(142, 76%, 36%)"; // green-600
  } else if (ratio < 0.5) {
    // 9-16: Blue
    return "hsl(217, 91%, 60%)"; // blue-500
  } else if (ratio < 0.75) {
    // 17-24: Amber/warning
    return "hsl(45, 93%, 47%)"; // amber-500
  } else {
    // 25-32: Red/error
    return "hsl(0, 72%, 51%)"; // red-600
  }
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
          <span className="text-muted-foreground">Points %:</span>{" "}
          <span className="font-mono font-semibold">{(data.pointsPct * 100).toFixed(1)}%</span>
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
          <CardTitle>Team Rankings</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Team Rankings by Points %</CardTitle>
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
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.5 }} />
            <Bar
              dataKey="pointsPct"
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
            <span className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(142, 76%, 36%)" }} />
            <span>Top 8</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(217, 91%, 60%)" }} />
            <span>9-16</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(45, 93%, 47%)" }} />
            <span>17-24</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(0, 72%, 51%)" }} />
            <span>25-32</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
