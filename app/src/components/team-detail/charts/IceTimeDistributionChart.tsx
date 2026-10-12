import { useNavigate } from "@tanstack/react-router";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
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
import { CHART_COLOURS, CHART_AXIS_COLOURS } from "@/lib/chart-colours";
import { formatIceTimeLong, formatToiPerGame } from "@/lib/formatters";
import { getPlayerHeadshotUrl, getPlayerInitials } from "@/lib/player-headshots";
import { useMediaQuery } from "@/hooks";
import type { RosterPlayer } from "@/types/player";

interface IceTimeDistributionChartProps {
  players: RosterPlayer[];
  teamAbbrev: string;
}

interface ChartDataPoint {
  playerId: number;
  name: string;
  team: string;
  position: string;
  toi: number;
  toiFormatted: string;
  gamesPlayed: number;
}

const POSITION_COLOURS: Record<string, string> = {
  F: CHART_COLOURS[0], // Blue for forwards
  D: CHART_COLOURS[4], // Violet for defensemen
};

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const positionType = ["C", "L", "R", "LW", "RW", "F"].includes(data.position)
    ? "Forward"
    : "Defenseman";

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
        <span className="text-muted-foreground text-xs">({positionType})</span>
      </div>
      <div className="space-y-1 text-xs">
        <p>
          <span className="text-muted-foreground">Total TOI:</span>{" "}
          <span className="font-mono font-semibold">{data.toiFormatted}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Games Played:</span>{" "}
          <span className="font-mono">{data.gamesPlayed}</span>
        </p>
        <p>
          <span className="text-muted-foreground">TOI/Game:</span>{" "}
          <span className="font-mono">
            {formatToiPerGame(data.toi, data.gamesPlayed) || "-"}
          </span>
        </p>
      </div>
    </div>
  );
}

export function IceTimeDistributionChart({
  players,
  teamAbbrev,
}: IceTimeDistributionChartProps) {
  const navigate = useNavigate();
  const isMobile = !useMediaQuery("(min-width: 640px)");

  // Filter to skaters with ice time data, sort by TOI descending, take top 15
  const chartData: ChartDataPoint[] = players
    .filter(
      (p) =>
        p.position !== "G" &&
        p.iceTimeSeconds != null &&
        p.iceTimeSeconds > 0
    )
    .map((player) => ({
      playerId: player.id,
      name: player.name,
      team: player.currentTeamAbbreviation ?? teamAbbrev,
      position: player.position ?? "F",
      toi: player.iceTimeSeconds ?? 0,
      toiFormatted: formatIceTimeLong(player.iceTimeSeconds ?? 0),
      gamesPlayed: player.gamesPlayed ?? 0,
    }))
    .sort((a, b) => b.toi - a.toi)
    .slice(0, 15);

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
          <CardTitle className="text-lg">Ice Time Distribution</CardTitle>
          <CardDescription>
            No ice time data available for this roster
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Ice Time Distribution</CardTitle>
        <CardDescription>
          Top 15 skaters by total ice time this season
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: isMobile ? 10 : 30, bottom: 10, left: isMobile ? 80 : 100 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
              horizontal={true}
              vertical={false}
            />
            <XAxis
              type="number"
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
              tickFormatter={(v: number) => formatIceTimeLong(v)}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: isMobile ? 10 : 11 }}
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
              width={isMobile ? 75 : 95}
              tickLine={false}
              axisLine={false}
              tickFormatter={(name: string) => isMobile && name.length > 12 ? name.slice(0, 11) + "…" : name}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.3 }}
            />
            <Bar
              dataKey="toi"
              radius={[0, 4, 4, 0]}
              cursor="pointer"
              onClick={(_, index) => handleClick(chartData[index])}
            >
              {chartData.map((entry) => {
                const isForward = ["C", "L", "R", "LW", "RW", "F"].includes(
                  entry.position
                );
                return (
                  <Cell
                    key={entry.playerId}
                    fill={isForward ? POSITION_COLOURS.F : POSITION_COLOURS.D}
                    fillOpacity={0.85}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="flex justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: POSITION_COLOURS.F }}
            />
            <span className="text-muted-foreground">Forwards</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: POSITION_COLOURS.D }}
            />
            <span className="text-muted-foreground">Defensemen</span>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-3">
          Click on a player to view their profile
        </p>
      </CardContent>
    </Card>
  );
}
