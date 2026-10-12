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
import type { LeaderboardEntry, LeaderboardCategory } from "@/types";

interface Top10LeadersChartProps {
  entries: LeaderboardEntry[];
  category: LeaderboardCategory;
  season?: number;
}

interface ChartDataPoint {
  playerId: number;
  name: string;
  team: string;
  value: number;
  rank: number;
}

const CATEGORY_LABELS: Record<LeaderboardCategory, string> = {
  points: "Points",
  goals: "Goals",
  assists: "Assists",
  shots: "Shots",
  expectedGoals: "Expected Goals",
  xgPer60: "xG/60",
  corsiPct: "CF%",
  fenwickPct: "FF%",
  oiShPct: "On-Ice Sh%",
  oiSvPct: "On-Ice Sv%",
  iceTime: "Ice Time (min)",
  gamesPlayed: "Games Played",
  faceoffPct: "FO%",
  savePct: "Save %",
  gaa: "GAA",
  gsax: "GSAx",
  shotsAgainst: "Shots Against",
  goalieTime: "Ice Time (min)",
  goalsAgainst: "Goals Against",
  xga: "xGA",
  reboundControl: "Rebound Control",
};

// Custom tooltip
function CustomTooltip({
  active,
  payload,
  category,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
  category: LeaderboardCategory;
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
      <div className="text-xs">
        <p>
          <span className="text-muted-foreground">
            {CATEGORY_LABELS[category]}:
          </span>{" "}
          <span className="font-mono font-semibold">
            {formatValue(data.value, category)}
          </span>
        </p>
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

  const clipId = `clip-leader-${playerId}`;

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

function formatValue(value: number, category: LeaderboardCategory): string {
  switch (category) {
    case "savePct":
    case "corsiPct":
    case "fenwickPct":
    case "oiShPct":
    case "oiSvPct":
      return `${(value * 100).toFixed(1)}%`;
    case "gaa":
    case "xgPer60":
    case "expectedGoals":
    case "gsax":
    case "xga":
      return value.toFixed(2);
    case "iceTime":
    case "goalieTime":
      // Convert seconds to minutes
      return Math.round(value / 60).toLocaleString();
    default:
      return value.toLocaleString();
  }
}

export function Top10LeadersChart({
  entries,
  category,
}: Top10LeadersChartProps) {
  const navigate = useNavigate();

  // Take top 10
  const chartData: (ChartDataPoint & { playerKey: string })[] = entries
    .slice(0, 10)
    .map((entry) => ({
      playerId: entry.playerId,
      name: entry.name,
      team: entry.team ?? "",
      value: entry.primaryValue,
      rank: entry.rank,
      // Format: "playerId|team" for the Y-axis tick to parse
      playerKey: `${entry.playerId}|${entry.team ?? ""}`,
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
          <CardTitle>Top 10 Leaders</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // For categories where lower is better, we still show bars but note it
  const lowerIsBetter = ["gaa", "goalsAgainst", "xga"].includes(category);

  // Calculate domain for percentage-based metrics to make differences visible
  const getXDomain = (): [number, number] | undefined => {
    const percentageCategories = [
      "savePct",
      "corsiPct",
      "fenwickPct",
      "oiShPct",
      "oiSvPct",
    ];
    if (!percentageCategories.includes(category)) return undefined;

    const values = chartData.map((d) => d.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);

    // Add small padding and round to nice values
    const padding = (maxVal - minVal) * 0.1;
    const domainMin = Math.floor((minVal - padding) * 1000) / 1000;
    const domainMax = Math.ceil((maxVal + padding) * 1000) / 1000;

    return [Math.max(0, domainMin), Math.min(1, domainMax)];
  };

  const xDomain = getXDomain();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">
          Top 10: {CATEGORY_LABELS[category]}
        </CardTitle>
        <CardDescription>
          {lowerIsBetter
            ? "Lower values are better"
            : "League leaders in this category"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
          >
            <XAxis
              type="number"
              domain={xDomain}
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => formatValue(v, category)}
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
              content={<CustomTooltip category={category} />}
              cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.3 }}
            />
            <Bar
              dataKey="value"
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
