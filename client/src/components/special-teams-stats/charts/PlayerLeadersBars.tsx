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
import { TeamLogo } from "@/components/shared";
import { CHART_AXIS_COLOURS } from "@/lib/chart-colours";
import {
  getPlayerHeadshotUrl,
  getPlayerInitials,
} from "@/lib/player-headshots";
import type { SpecialTeamsPlayerLeader } from "@/types";

interface PlayerLeadersBarsProps {
  players: SpecialTeamsPlayerLeader[];
  situation: "5on4" | "4on5";
  metric?: "points" | "pointsPer60";
}

interface ChartDataPoint {
  playerId: number;
  name: string;
  team: string;
  value: number;
  rank: number;
  playerKey: string;
}

// Generate gradient color based on rank
function getRankColor(rank: number): string {
  if (rank <= 5) {
    return "hsl(142, 76%, 36%)"; // green-600 (top 5)
  } else if (rank <= 10) {
    return "hsl(217, 91%, 60%)"; // blue-500 (6-10)
  } else if (rank <= 15) {
    return "hsl(45, 93%, 47%)"; // amber-500 (11-15)
  } else {
    return "hsl(215, 20%, 65%)"; // gray (16+)
  }
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

  const clipId = `clip-st-leader-${playerId}`;

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

// Custom tooltip
function CustomTooltip({
  active,
  payload,
  metric,
  situation,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
  metric: "points" | "pointsPer60";
  situation: "5on4" | "4on5";
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const situationLabel = situation === "5on4" ? "PP" : "PK";
  const metricLabel = metric === "points" ? "Points" : "P/60";

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
        <TeamLogo abbrev={data.team} size="xs" />
        <span className="font-semibold">{data.name}</span>
      </div>
      <div className="space-y-1">
        <p>
          <span className="text-muted-foreground">Rank:</span>{" "}
          <span className="font-mono font-semibold">#{data.rank}</span>
        </p>
        <p>
          <span className="text-muted-foreground">
            {situationLabel} {metricLabel}:
          </span>{" "}
          <span className="font-mono font-semibold">
            {metric === "points" ? data.value : data.value.toFixed(2)}
          </span>
        </p>
      </div>
    </div>
  );
}

export function PlayerLeadersBars({
  players,
  situation,
  metric = "points",
}: PlayerLeadersBarsProps) {
  const navigate = useNavigate();

  // Take top 20 players sorted by the metric
  const sortedPlayers = [...players]
    .sort((a, b) => {
      const aVal = metric === "points" ? a.points : a.pointsPer60;
      const bVal = metric === "points" ? b.points : b.pointsPer60;
      return bVal - aVal;
    })
    .slice(0, 20);

  const chartData: ChartDataPoint[] = sortedPlayers.map((player, index) => ({
    playerId: player.playerId,
    name: player.name,
    team: player.team,
    value: metric === "points" ? player.points : player.pointsPer60,
    rank: index + 1,
    // Format: "playerId|team" for the Y-axis tick to parse
    playerKey: `${player.playerId}|${player.team}`,
  }));

  const handleClick = (data: ChartDataPoint) => {
    navigate({
      to: "/players/$id",
      params: { id: String(data.playerId) },
    });
  };

  const situationLabel = situation === "5on4" ? "Power Play" : "Penalty Kill";
  const metricLabel = metric === "points" ? "Points" : "Points per 60";
  const title = `Top ${situationLabel} ${metricLabel}`;
  const description = `Top 20 players by ${situationLabel.toLowerCase()} ${metricLabel.toLowerCase()}`;

  if (players.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Calculate domain
  const values = chartData.map((d) => d.value);
  const maxVal = Math.ceil(Math.max(...values) * 1.1);

  // Recharts may auto-skip category ticks (hiding headshots) if it thinks
  // there isn't enough room. Give each row a bit more vertical space and
  // force all ticks to render.
  const chartHeight = Math.max(600, chartData.length * 36);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 45, bottom: 5 }}
          >
            <XAxis
              type="number"
              domain={[0, maxVal]}
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="playerKey"
              tick={<CustomYAxisTick />}
              interval={0}
              width={45}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<CustomTooltip metric={metric} situation={situation} />}
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
                  key={`cell-${entry.playerId}`}
                  fill={getRankColor(entry.rank)}
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
            <span>Top 5</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded"
              style={{ backgroundColor: "hsl(217, 91%, 60%)" }}
            />
            <span>6-10</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded"
              style={{ backgroundColor: "hsl(45, 93%, 47%)" }}
            />
            <span>11-15</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded"
              style={{ backgroundColor: "hsl(215, 20%, 65%)" }}
            />
            <span>16-20</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
