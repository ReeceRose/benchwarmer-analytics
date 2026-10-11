import { useNavigate } from "@tanstack/react-router";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getPlayerHeadshotUrl, getPlayerInitials } from "@/lib/player-headshots";
import type { RosterPlayer } from "@/types/player";

interface PointsContributionChartProps {
  players: RosterPlayer[];
  teamAbbrev: string;
}

interface ChartDataPoint {
  playerId: number | null;
  name: string;
  team: string;
  points: number;
  goals: number;
  assists: number;
  percentage: number;
  isOther: boolean;
}

const PIE_COLOURS = [
  "#2563eb", // Blue
  "#16a34a", // Green
  "#ca8a04", // Gold
  "#7c3aed", // Violet
  "#dc2626", // Red
  "#0891b2", // Cyan
  "#db2777", // Rose
  "#ea580c", // Orange
  "hsl(var(--muted-foreground))", // Gray for "Other"
];

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
        {!data.isOther && data.playerId && (
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
        )}
        <span className="font-semibold">{data.name}</span>
      </div>
      <div className="space-y-1 text-xs">
        <p>
          <span className="text-muted-foreground">Points:</span>{" "}
          <span className="font-mono font-semibold">{data.points}</span>
          <span className="text-muted-foreground ml-1">
            ({data.percentage.toFixed(1)}%)
          </span>
        </p>
        {!data.isOther && (
          <p>
            <span className="text-muted-foreground">Goals/Assists:</span>{" "}
            <span className="font-mono">
              {data.goals}G / {data.assists}A
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

export function PointsContributionChart({
  players,
  teamAbbrev,
}: PointsContributionChartProps) {
  const navigate = useNavigate();

  // Filter to skaters with points, sort by points descending
  const skatersWithPoints = players
    .filter(
      (p) => p.position !== "G" && p.points != null && p.points > 0
    )
    .map((player) => ({
      playerId: player.id,
      name: player.name,
      team: player.currentTeamAbbreviation ?? teamAbbrev,
      points: player.points ?? 0,
      goals: player.goals ?? 0,
      assists: player.assists ?? 0,
    }))
    .sort((a, b) => b.points - a.points);

  const totalPoints = skatersWithPoints.reduce((sum, p) => sum + p.points, 0);

  // Take top 8 and group rest as "Other"
  const topPlayers = skatersWithPoints.slice(0, 8);
  const otherPlayers = skatersWithPoints.slice(8);
  const otherPoints = otherPlayers.reduce((sum, p) => sum + p.points, 0);

  const chartData: ChartDataPoint[] = topPlayers.map((player) => ({
    ...player,
    percentage: totalPoints > 0 ? (player.points / totalPoints) * 100 : 0,
    isOther: false,
  }));

  if (otherPoints > 0) {
    chartData.push({
      playerId: null,
      name: `Other (${otherPlayers.length} players)`,
      team: teamAbbrev,
      points: otherPoints,
      goals: otherPlayers.reduce((sum, p) => sum + p.goals, 0),
      assists: otherPlayers.reduce((sum, p) => sum + p.assists, 0),
      percentage: totalPoints > 0 ? (otherPoints / totalPoints) * 100 : 0,
      isOther: true,
    });
  }

  const handleClick = (data: ChartDataPoint) => {
    if (data.playerId) {
      navigate({
        to: "/players/$id",
        params: { id: String(data.playerId) },
      });
    }
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Points Contribution</CardTitle>
          <CardDescription>
            No points data available for this roster
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Calculate if scoring is top-heavy (top 3 have >50% of points)
  const top3Points = topPlayers.slice(0, 3).reduce((sum, p) => sum + p.points, 0);
  const top3Percentage = totalPoints > 0 ? (top3Points / totalPoints) * 100 : 0;
  const scoringDepth =
    top3Percentage > 50
      ? "Top-heavy scoring"
      : top3Percentage > 40
        ? "Moderate depth"
        : "Deep scoring";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Points Contribution</CardTitle>
        <CardDescription>
          {totalPoints} total points | {scoringDepth} (top 3: {top3Percentage.toFixed(0)}%)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row items-center gap-4">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="points"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                cursor="pointer"
                onClick={(_, index: number) => handleClick(chartData[index])}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={entry.playerId ?? "other"}
                    fill={PIE_COLOURS[index % PIE_COLOURS.length]}
                    fillOpacity={entry.isOther ? 0.5 : 0.85}
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          <div className="w-full lg:w-auto lg:min-w-48">
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 text-sm">
              {chartData.slice(0, 6).map((entry, index) => (
                <button
                  key={entry.playerId ?? "other"}
                  onClick={() => handleClick(entry)}
                  disabled={entry.isOther}
                  className="flex items-center gap-2 text-left hover:bg-muted/50 rounded px-2 py-1 transition-colors disabled:cursor-default disabled:hover:bg-transparent"
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{
                      backgroundColor: PIE_COLOURS[index % PIE_COLOURS.length],
                      opacity: entry.isOther ? 0.5 : 1,
                    }}
                  />
                  <span className="truncate text-xs">
                    {entry.isOther ? entry.name : entry.name.split(" ").pop()}
                  </span>
                  <span className="ml-auto font-mono text-xs text-muted-foreground">
                    {entry.points}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-3">
          Click on a segment to view player profile
        </p>
      </CardContent>
    </Card>
  );
}
