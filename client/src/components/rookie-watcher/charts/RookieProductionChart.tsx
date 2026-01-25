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
import type { Rookie } from "@/types";

interface RookieProductionChartProps {
  rookies: Rookie[];
}

interface ChartDataPoint {
  playerId: number;
  name: string;
  team: string;
  points: number;
  goals: number;
  assists: number;
  gamesPlayed: number;
  age: number;
  rank: number;
}

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
          <span className="text-muted-foreground">Points:</span>{" "}
          <span className="font-mono font-semibold">{data.points}</span>
          <span className="text-muted-foreground ml-1">
            ({data.goals}G + {data.assists}A)
          </span>
        </p>
        <p>
          <span className="text-muted-foreground">Games Played:</span>{" "}
          <span className="font-mono">{data.gamesPlayed}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Age:</span>{" "}
          <span className="font-mono">{data.age}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Rank:</span>{" "}
          <span className="font-mono">#{data.rank}</span>
        </p>
      </div>
    </div>
  );
}

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

  const [playerIdStr, team] = payload.value.split("|");
  const playerId = parseInt(playerIdStr, 10);
  const clipId = `clip-rookie-prod-${playerId}`;

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

export function RookieProductionChart({ rookies }: RookieProductionChartProps) {
  const navigate = useNavigate();

  const chartData: (ChartDataPoint & { playerKey: string })[] = [...rookies]
    .sort((a, b) => b.points - a.points)
    .slice(0, 15)
    .map((rookie, index) => ({
      playerId: rookie.playerId,
      name: rookie.name,
      team: rookie.team,
      points: rookie.points,
      goals: rookie.goals,
      assists: rookie.assists,
      gamesPlayed: rookie.gamesPlayed,
      age: rookie.age,
      rank: index + 1,
      playerKey: `${rookie.playerId}|${rookie.team}`,
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
          <CardTitle>Top Rookie Scorers</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Top Rookie Scorers</CardTitle>
        <CardDescription>
          First-year players ranked by total points
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
              dataKey="points"
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
