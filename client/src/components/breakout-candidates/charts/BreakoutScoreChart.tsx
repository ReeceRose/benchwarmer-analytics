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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CHART_AXIS_COLOURS, CHART_COLOURS } from "@/lib/chart-colours";
import { getPlayerHeadshotUrl, getPlayerInitials } from "@/lib/player-headshots";
import type { BreakoutCandidate } from "@/types";

interface BreakoutScoreChartProps {
  candidates: BreakoutCandidate[];
}

interface ChartDataPoint {
  playerId: number;
  name: string;
  team: string;
  breakoutScore: number;
  goalsDiff: number;
  corsiPct: number | null;
  rank: number;
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
        <Avatar className="h-6 w-6">
          <AvatarImage
            src={getPlayerHeadshotUrl(data.playerId, data.team)}
            alt={data.name}
            loading="lazy"
          />
          <AvatarFallback className="text-[10px]">
            {getPlayerInitials(data.name)}
          </AvatarFallback>
        </Avatar>
        <span className="font-semibold">{data.name}</span>
      </div>
      <div className="space-y-1 text-xs">
        <p>
          <span className="text-muted-foreground">Breakout Score:</span>{" "}
          <span className="font-mono font-semibold">
            {data.breakoutScore.toFixed(1)}
          </span>
        </p>
        <p>
          <span className="text-muted-foreground">Goals Diff (xG - G):</span>{" "}
          <span className="font-mono text-success">
            +{data.goalsDiff.toFixed(1)}
          </span>
        </p>
        {data.corsiPct != null && (
          <p>
            <span className="text-muted-foreground">CF%:</span>{" "}
            <span className="font-mono">
              {(data.corsiPct * 100).toFixed(1)}%
            </span>
          </p>
        )}
        <p>
          <span className="text-muted-foreground">Rank:</span>{" "}
          <span className="font-mono">#{data.rank}</span>
        </p>
      </div>
    </div>
  );
}

// Custom Y-axis tick with player headshot
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

  // Extract playerId and team from the payload value (format: "playerId|team")
  const [playerIdStr, team] = payload.value.split("|");
  const playerId = parseInt(playerIdStr, 10);

  const clipId = `clip-breakout-${playerId}`;

  return (
    <g transform={`translate(${x},${y})`}>
      <defs>
        <clipPath id={clipId}>
          <circle cx={-20} cy={0} r={12} />
        </clipPath>
      </defs>
      <image
        href={getPlayerHeadshotUrl(playerId, team)}
        x={-32}
        y={-12}
        width={24}
        height={24}
        clipPath={`url(#${clipId})`}
      />
      <circle
        cx={-20}
        cy={0}
        r={12}
        fill="none"
        stroke="hsl(var(--border))"
        strokeWidth={1}
      />
    </g>
  );
}

export function BreakoutScoreChart({ candidates }: BreakoutScoreChartProps) {
  const navigate = useNavigate();

  // Take top 15 by breakout score
  const chartData: (ChartDataPoint & { playerKey: string })[] = [...candidates]
    .sort((a, b) => b.breakoutScore - a.breakoutScore)
    .slice(0, 15)
    .map((candidate, index) => ({
      playerId: candidate.playerId,
      name: candidate.name,
      team: candidate.team,
      breakoutScore: candidate.breakoutScore,
      goalsDiff: candidate.goalsDifferential,
      corsiPct: candidate.corsiForPct,
      rank: index + 1,
      // Format: "playerId|team" for the Y-axis tick to parse
      playerKey: `${candidate.playerId}|${candidate.team}`,
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
          <CardTitle>Top Breakout Candidates</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Top Breakout Candidates</CardTitle>
        <CardDescription>
          Players ranked by combined breakout score
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={500}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
          >
            <XAxis
              type="number"
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="playerKey"
              tick={<CustomYAxisTick />}
              width={45}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.3 }}
            />
            <Bar
              dataKey="breakoutScore"
              cursor="pointer"
              onClick={(data) => handleClick(data as unknown as ChartDataPoint)}
              radius={[0, 4, 4, 0]}
            >
              {chartData.map((_, index) => (
                <Cell
                  key={index}
                  fill={CHART_COLOURS[index % CHART_COLOURS.length]}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
