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
import { CHART_COLOURS } from "@/lib/chart-colours";
import type { GoalieStats } from "@/types";

interface GoalieData {
  name: string;
  stats: GoalieStats | null | undefined;
}

interface GoalieDangerZoneComparisonProps {
  players: GoalieData[];
  title?: string;
  className?: string;
}

// League average baselines for danger zone save percentages
// Based on MoneyPuck xG thresholds: Low (<0.06), Medium (0.06-0.15), High (>0.15)
const LEAGUE_AVERAGES = {
  lowDanger: 0.965,
  mediumDanger: 0.915,
  highDanger: 0.865,
};

interface DangerZoneStats {
  lowSvPct: number | null;
  medSvPct: number | null;
  highSvPct: number | null;
}

function calculateDangerZoneStats(stats: GoalieStats): DangerZoneStats {
  const calcSavePct = (shots: number, goals: number): number | null => {
    if (shots === 0) return null;
    return (shots - goals) / shots;
  };

  return {
    lowSvPct: calcSavePct(stats.lowDangerShots, stats.lowDangerGoals),
    medSvPct: calcSavePct(stats.mediumDangerShots, stats.mediumDangerGoals),
    highSvPct: calcSavePct(stats.highDangerShots, stats.highDangerGoals),
  };
}

function formatPct(value: number | null): string {
  if (value === null) return "-";
  return (value * 100).toFixed(1) + "%";
}

// Custom tooltip
function RadarChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    dataKey: string;
    color: string;
    payload: {
      zone: string;
      leagueRaw: string;
      [key: string]: string | number;
    };
  }>;
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold mb-2">{data.zone}</p>
      <div className="space-y-1 text-xs">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}:
            </span>
            <span className="font-mono">
              {data[`${entry.dataKey}Raw`] || "-"}
            </span>
          </div>
        ))}
        <hr className="my-1 border-border" />
        <div className="flex justify-between gap-4 text-muted-foreground">
          <span>League Avg:</span>
          <span className="font-mono">{data.leagueRaw}</span>
        </div>
      </div>
    </div>
  );
}

export function GoalieDangerZoneComparison({
  players,
  title = "Danger Zone Comparison",
  className,
}: GoalieDangerZoneComparisonProps) {
  const validPlayers = players.filter((p) => p.stats != null);

  if (validPlayers.length === 0) {
    return null;
  }

  // Calculate danger zone stats for each player
  const playerStats = validPlayers.map((player) => ({
    name: player.name,
    stats: calculateDangerZoneStats(player.stats!),
  }));

  // Check if we have any valid data
  const hasData = playerStats.some(
    (p) =>
      p.stats.lowSvPct !== null ||
      p.stats.medSvPct !== null ||
      p.stats.highSvPct !== null,
  );

  if (!hasData) {
    return null;
  }

  // Normalize save percentages to 0-100 scale (80% to 100% mapped to 0-100)
  const minSvPct = 0.8;
  const maxSvPct = 1.0;
  const normalize = (svPct: number | null): number => {
    if (svPct === null) return 0;
    return Math.max(
      0,
      Math.min(100, ((svPct - minSvPct) / (maxSvPct - minSvPct)) * 100),
    );
  };

  // Build radar data with all players
  const zones = [
    { key: "low", label: "Low Danger", leagueAvg: LEAGUE_AVERAGES.lowDanger },
    {
      key: "med",
      label: "Medium Danger",
      leagueAvg: LEAGUE_AVERAGES.mediumDanger,
    },
    {
      key: "high",
      label: "High Danger",
      leagueAvg: LEAGUE_AVERAGES.highDanger,
    },
  ];

  const radarData = zones.map((zone) => {
    const dataPoint: Record<string, string | number> = {
      zone: zone.label,
      league: normalize(zone.leagueAvg),
      leagueRaw: formatPct(zone.leagueAvg),
      fullMark: 100,
    };

    playerStats.forEach((player) => {
      const svPct =
        zone.key === "low"
          ? player.stats.lowSvPct
          : zone.key === "med"
            ? player.stats.medSvPct
            : player.stats.highSvPct;

      dataPoint[player.name] = normalize(svPct);
      dataPoint[`${player.name}Raw`] = formatPct(svPct);
    });

    return dataPoint;
  });

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid className="stroke-muted" />
            <PolarAngleAxis
              dataKey="zone"
              tick={({ x, y, payload, textAnchor }) => (
                <text
                  x={x}
                  y={y}
                  textAnchor={textAnchor}
                  fontSize={11}
                  className="fill-foreground"
                >
                  {payload.value}
                </text>
              )}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={false}
              axisLine={false}
            />
            <Radar
              name="League Avg"
              dataKey="league"
              stroke="#94a3b8"
              fill="#94a3b8"
              fillOpacity={0.1}
              strokeWidth={1}
              strokeDasharray="5 5"
            />
            {playerStats.map((player, i) => (
              <Radar
                key={player.name}
                name={player.name}
                dataKey={player.name}
                stroke={CHART_COLOURS[i % CHART_COLOURS.length]}
                fill={CHART_COLOURS[i % CHART_COLOURS.length]}
                fillOpacity={0.25}
                strokeWidth={2}
              />
            ))}
            <Tooltip
              content={<RadarChartTooltip />}
              wrapperStyle={{
                outline: "none",
                background: "transparent",
                border: "none",
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "12px" }}
              formatter={(value) => (
                <span className="text-foreground">{value}</span>
              )}
            />
          </RadarChart>
        </ResponsiveContainer>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-1.5 font-medium">Goalie</th>
                <th className="text-right py-1.5 font-medium">Low</th>
                <th className="text-right py-1.5 font-medium">Medium</th>
                <th className="text-right py-1.5 font-medium">High</th>
              </tr>
            </thead>
            <tbody>
              {playerStats.map((player, i) => (
                <tr key={player.name} className="border-b border-border/50">
                  <td className="py-1.5 flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor:
                          CHART_COLOURS[i % CHART_COLOURS.length],
                      }}
                    />
                    {player.name.split(" ").pop()}
                  </td>
                  <td className="text-right font-mono">
                    {formatPct(player.stats.lowSvPct)}
                  </td>
                  <td className="text-right font-mono">
                    {formatPct(player.stats.medSvPct)}
                  </td>
                  <td className="text-right font-mono">
                    {formatPct(player.stats.highSvPct)}
                  </td>
                </tr>
              ))}
              <tr className="text-muted-foreground">
                <td className="py-1.5">League Avg</td>
                <td className="text-right font-mono">
                  {formatPct(LEAGUE_AVERAGES.lowDanger)}
                </td>
                <td className="text-right font-mono">
                  {formatPct(LEAGUE_AVERAGES.mediumDanger)}
                </td>
                <td className="text-right font-mono">
                  {formatPct(LEAGUE_AVERAGES.highDanger)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
