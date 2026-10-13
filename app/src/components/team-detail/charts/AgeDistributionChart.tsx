import { useNavigate } from "@tanstack/react-router";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CHART_AXIS_COLOURS } from "@/lib/chart-colours";
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
  { label: "18-22", range: "Entry level", min: 18, max: 22 },
  { label: "23-26", range: "Rising", min: 23, max: 26 },
  { label: "27-30", range: "Prime", min: 27, max: 30 },
  { label: "31-34", range: "Veteran", min: 31, max: 34 },
  { label: "35+", range: "Late career", min: 35, max: 99 },
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
    <div className="rounded-xl border bg-popover text-popover-foreground shadow-lg shadow-black/5 p-3 text-sm max-w-xs">
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

/** Age range with its career phase underneath, in place of a colour legend. */
function AgeBinTick(props: unknown) {
  const { x, y, payload } = props as { x: number; y: number; payload: { value: string } };
  const phase = AGE_BINS.find((b) => b.label === payload.value)?.range;
  return (
    <text x={x} y={y + 12} textAnchor="middle" fontSize={11} fill={CHART_AXIS_COLOURS.tick}>
      <tspan x={x}>{payload.value}</tspan>
      <tspan x={x} dy={14} fontSize={10} opacity={0.75}>
        {phase}
      </tspan>
    </text>
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
          <CardTitle className="text-base">Age distribution</CardTitle>
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
        <CardTitle className="text-base">Age distribution</CardTitle>
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
              height={36}
              tick={AgeBinTick}
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
              cursor={{ fill: "var(--muted)", fillOpacity: 0.3 }}
            />
            <Bar
              dataKey="count"
              radius={[6, 6, 0, 0]}
              cursor="pointer"
              onClick={(data) => handleClick(data as unknown as AgeBin)}
              fill="var(--chart-1)"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
