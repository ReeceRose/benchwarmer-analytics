import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_COLORS } from "@/lib/chart-colors";
import type { SkaterStats } from "@/types";

interface PlayerData {
  name: string;
  stats: SkaterStats | null | undefined;
  color?: string;
}

interface RadarComparisonProps {
  players: PlayerData[];
  title?: string;
  className?: string;
}

// Stat definitions for radar chart
interface StatDef {
  key: string;
  label: string;
  getValue: (stats: SkaterStats) => number | null;
  maxValue?: number;
}

const STAT_DEFS: StatDef[] = [
  {
    key: "goals",
    label: "Goals",
    getValue: (s) => s.goals,
  },
  {
    key: "assists",
    label: "Assists",
    getValue: (s) => s.assists,
  },
  {
    key: "shots",
    label: "Shots",
    getValue: (s) => s.shots,
  },
  {
    key: "xg",
    label: "xG",
    getValue: (s) => s.expectedGoals ?? null,
  },
  {
    key: "cf",
    label: "CF%",
    getValue: (s) => (s.corsiForPct != null ? s.corsiForPct * 100 : null),
    maxValue: 70,
  },
  {
    key: "toi",
    label: "TOI/GP",
    getValue: (s) =>
      s.gamesPlayed > 0 ? s.iceTimeSeconds / s.gamesPlayed / 60 : null,
  },
];

// Normalize value to 0-100 scale for radar chart
function normalizeValue(
  value: number | null,
  allValues: (number | null)[],
  maxOverride?: number
): number {
  if (value === null) return 0;

  const validValues = allValues.filter((v): v is number => v !== null);
  if (validValues.length === 0) return 0;

  const max = maxOverride ?? Math.max(...validValues);
  if (max === 0) return 0;

  return Math.min(100, (value / max) * 100);
}

// Custom tooltip component for radar chart
function RadarChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: Record<string, string | number>;
    color: string;
  }>;
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const stat = data.stat as string;

  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold mb-2">{stat}</p>
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span>{entry.name}:</span>
            <span className="font-mono ml-auto">
              {data[`${entry.name}_raw`]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RadarComparison({
  players,
  title = "Player Comparison",
  className,
}: RadarComparisonProps) {
  // Filter out players without stats
  const validPlayers = players.filter((p) => p.stats != null);

  if (validPlayers.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No player stats available for comparison
          </div>
        </CardContent>
      </Card>
    );
  }

  // Build radar data
  const radarData = STAT_DEFS.map((def) => {
    const allValues = validPlayers.map((p) => def.getValue(p.stats!));

    const dataPoint: Record<string, string | number> = {
      stat: def.label,
      fullMark: 100,
    };

    validPlayers.forEach((player) => {
      const value = def.getValue(player.stats!);
      dataPoint[player.name] = normalizeValue(value, allValues, def.maxValue);
      // Store raw value for tooltip
      dataPoint[`${player.name}_raw`] =
        value !== null ? (def.key === "cf" ? value.toFixed(1) : value.toFixed(1)) : "-";
    });

    return dataPoint;
  });

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid className="stroke-muted" />
            <PolarAngleAxis
              dataKey="stat"
              tick={({ x, y, payload, textAnchor }) => (
                <text
                  x={x}
                  y={y}
                  textAnchor={textAnchor}
                  fontSize={12}
                  className="fill-foreground"
                >
                  {payload.value}
                </text>
              )}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={false}
              axisLine={false}
            />
            {validPlayers.map((player, i) => (
              <Radar
                key={player.name}
                name={player.name}
                dataKey={player.name}
                stroke={player.color ?? CHART_COLORS[i % CHART_COLORS.length]}
                fill={player.color ?? CHART_COLORS[i % CHART_COLORS.length]}
                fillOpacity={0.15}
                strokeWidth={2}
              />
            ))}
            <Tooltip content={<RadarChartTooltip />} wrapperStyle={{ outline: 'none', background: 'transparent', border: 'none' }} />
            {validPlayers.length > 1 && (
              <Legend
                wrapperStyle={{ fontSize: "12px" }}
                formatter={(value) => (
                  <span className="text-foreground">{value}</span>
                )}
              />
            )}
          </RadarChart>
        </ResponsiveContainer>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Values normalized relative to compared players
        </p>
      </CardContent>
    </Card>
  );
}
