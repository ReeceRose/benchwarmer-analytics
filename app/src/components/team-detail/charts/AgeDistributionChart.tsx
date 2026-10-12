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
import { getPlayerHeadshotUrl, getPlayerInitials } from "@/lib/player-headshots";
import type { RosterPlayer } from "@/types/player";

interface AgeDistributionChartProps {
  players: RosterPlayer[];
  teamAbbrev: string;
}

interface AgeBin {
  label: string;
  range: string;
  min: number;
  max: number;
  count: number;
  players: Array<{
    id: number;
    name: string;
    age: number;
    position: string;
    team: string;
  }>;
}

const AGE_BINS: Omit<AgeBin, "count" | "players">[] = [
  { label: "18-22", range: "Entry Level", min: 18, max: 22 },
  { label: "23-26", range: "Rising", min: 23, max: 26 },
  { label: "27-30", range: "Prime", min: 27, max: 30 },
  { label: "31-34", range: "Veteran", min: 31, max: 34 },
  { label: "35+", range: "Late Career", min: 35, max: 99 },
];

const BIN_COLOURS = [
  CHART_COLOURS[0], // Blue - Entry level
  CHART_COLOURS[4], // Violet - Rising
  CHART_COLOURS[2], // Green - Prime
  CHART_COLOURS[3], // Gold - Veteran
  CHART_COLOURS[1], // Red - Late career
];

function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: AgeBin }>;
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm max-w-xs">
      <div className="font-semibold mb-2">
        {data.label} ({data.range})
      </div>
      <div className="text-muted-foreground mb-2">
        {data.count} player{data.count !== 1 ? "s" : ""}
      </div>
      {data.players.length > 0 && (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {data.players.slice(0, 8).map((player) => (
            <div key={player.id} className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage
                  src={getPlayerHeadshotUrl(player.id, player.team)}
                  alt={player.name}
                  loading="lazy"
                />
                <AvatarFallback className="text-[8px]">
                  {getPlayerInitials(player.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs truncate">{player.name}</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {player.age}
              </span>
            </div>
          ))}
          {data.players.length > 8 && (
            <div className="text-xs text-muted-foreground">
              +{data.players.length - 8} more
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AgeDistributionChart({
  players,
  teamAbbrev,
}: AgeDistributionChartProps) {
  const navigate = useNavigate();

  // Calculate ages and bin the players
  const playersWithAge = players
    .filter((p) => p.birthDate)
    .map((player) => ({
      id: player.id,
      name: player.name,
      age: calculateAge(player.birthDate!),
      position: player.position ?? "?",
      team: player.currentTeamAbbreviation ?? teamAbbrev,
    }));

  const chartData: AgeBin[] = AGE_BINS.map((bin) => {
    const binPlayers = playersWithAge
      .filter((p) => p.age >= bin.min && p.age <= bin.max)
      .sort((a, b) => a.age - b.age);
    return {
      ...bin,
      count: binPlayers.length,
      players: binPlayers,
    };
  });

  const handleClick = (data: AgeBin) => {
    // Navigate to first player in the bin if there's only one
    if (data.players.length === 1) {
      navigate({
        to: "/players/$id",
        params: { id: String(data.players[0].id) },
      });
    }
  };

  // Calculate averages
  const totalAge = playersWithAge.reduce((sum, p) => sum + p.age, 0);
  const avgAge =
    playersWithAge.length > 0
      ? (totalAge / playersWithAge.length).toFixed(1)
      : "N/A";

  // Find largest bin for analysis
  const largestBin = chartData.reduce((a, b) => (a.count > b.count ? a : b));

  if (playersWithAge.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Age Distribution</CardTitle>
          <CardDescription>
            No birth date data available for this roster
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Age Distribution</CardTitle>
        <CardDescription>
          Average age: {avgAge} years | Most players in {largestBin.range} phase
          ({largestBin.label})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
              stroke={CHART_AXIS_COLOURS.grid}
              strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.3 }}
            />
            <Bar
              dataKey="count"
              radius={[4, 4, 0, 0]}
              cursor="pointer"
              onClick={(data) => handleClick(data as unknown as AgeBin)}
            >
              {chartData.map((_, index) => (
                <Cell key={index} fill={BIN_COLOURS[index]} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap justify-center gap-4 mt-4 text-xs">
          {AGE_BINS.map((bin, index) => (
            <div key={bin.label} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: BIN_COLOURS[index] }}
              />
              <span className="text-muted-foreground">{bin.range}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
