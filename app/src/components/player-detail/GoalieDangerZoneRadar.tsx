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

interface GoalieDangerZoneRadarProps {
  stats: GoalieStats[];
  leagueAverages?: {
    lowDanger: number;
    mediumDanger: number;
    highDanger: number;
  };
  className?: string;
}

// Fallback baselines if league averages aren't provided by the API.
// MoneyPuck defines danger zones by xG probability:
// Low (<0.08), Medium (>=0.08 and <0.20), High (>=0.20).
const DEFAULT_LEAGUE_AVERAGES = {
  lowDanger: 0.965,
  mediumDanger: 0.915,
  highDanger: 0.865,
};

interface DangerZoneData {
  zone: string;
  shots: number;
  goals: number;
  saves: number;
  savePct: number | null;
  leagueAvg: number;
  difference: number | null;
}

function calculateDangerZoneStats(stats: GoalieStats[]): DangerZoneData[] {
  // Aggregate all stats (typically filter to 5on5 or all situations already applied)
  const totals = stats.reduce(
    (acc, s) => ({
      lowShots: acc.lowShots + s.lowDangerShots,
      lowGoals: acc.lowGoals + s.lowDangerGoals,
      medShots: acc.medShots + s.mediumDangerShots,
      medGoals: acc.medGoals + s.mediumDangerGoals,
      highShots: acc.highShots + s.highDangerShots,
      highGoals: acc.highGoals + s.highDangerGoals,
    }),
    {
      lowShots: 0,
      lowGoals: 0,
      medShots: 0,
      medGoals: 0,
      highShots: 0,
      highGoals: 0,
    },
  );

  const calcSavePct = (shots: number, goals: number): number | null => {
    if (shots === 0) return null;
    return (shots - goals) / shots;
  };

  const lowSvPct = calcSavePct(totals.lowShots, totals.lowGoals);
  const medSvPct = calcSavePct(totals.medShots, totals.medGoals);
  const highSvPct = calcSavePct(totals.highShots, totals.highGoals);

  return [
    {
      zone: "Low Danger",
      shots: totals.lowShots,
      goals: totals.lowGoals,
      saves: totals.lowShots - totals.lowGoals,
      savePct: lowSvPct,
      leagueAvg: DEFAULT_LEAGUE_AVERAGES.lowDanger,
      difference:
        lowSvPct !== null ? lowSvPct - DEFAULT_LEAGUE_AVERAGES.lowDanger : null,
    },
    {
      zone: "Medium Danger",
      shots: totals.medShots,
      goals: totals.medGoals,
      saves: totals.medShots - totals.medGoals,
      savePct: medSvPct,
      leagueAvg: DEFAULT_LEAGUE_AVERAGES.mediumDanger,
      difference:
        medSvPct !== null
          ? medSvPct - DEFAULT_LEAGUE_AVERAGES.mediumDanger
          : null,
    },
    {
      zone: "High Danger",
      shots: totals.highShots,
      goals: totals.highGoals,
      saves: totals.highShots - totals.highGoals,
      savePct: highSvPct,
      leagueAvg: DEFAULT_LEAGUE_AVERAGES.highDanger,
      difference:
        highSvPct !== null
          ? highSvPct - DEFAULT_LEAGUE_AVERAGES.highDanger
          : null,
    },
  ];
}

function formatPct(value: number | null): string {
  if (value === null) return "-";
  return (value * 100).toFixed(1) + "%";
}

function formatDiff(value: number | null): string {
  if (value === null) return "-";
  const pct = value * 100;
  const sign = pct >= 0 ? "+" : "";
  return sign + pct.toFixed(1) + "%";
}

// Custom tooltip for the radar chart
function RadarChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: {
      zone: string;
      goaliePct: string;
      leaguePct: string;
      diff: string;
      shots: number;
      goals: number;
    };
    color: string;
  }>;
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold mb-2">{data.zone}</p>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Goalie SV%:</span>
          <span className="font-mono">{data.goaliePct}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">League Avg:</span>
          <span className="font-mono">{data.leaguePct}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">vs League:</span>
          <span
            className={`font-mono ${
              data.diff.startsWith("+")
                ? "text-success"
                : data.diff.startsWith("-")
                  ? "text-error"
                  : ""
            }`}
          >
            {data.diff}
          </span>
        </div>
        <hr className="my-1 border-border" />
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Shots:</span>
          <span className="font-mono">{data.shots}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Goals Against:</span>
          <span className="font-mono">{data.goals}</span>
        </div>
      </div>
    </div>
  );
}

export function GoalieDangerZoneRadar({
  stats,
  leagueAverages,
  className,
}: GoalieDangerZoneRadarProps) {
  if (stats.length === 0) {
    return null;
  }

  const dangerZoneData = calculateDangerZoneStats(stats).map((d) => {
    const leagueAvg =
      d.zone === "Low Danger"
        ? leagueAverages?.lowDanger
        : d.zone === "Medium Danger"
          ? leagueAverages?.mediumDanger
          : leagueAverages?.highDanger;

    if (leagueAvg == null) return d;

    return {
      ...d,
      leagueAvg,
      difference: d.savePct !== null ? d.savePct - leagueAvg : null,
    };
  });

  // Check if we have any valid data
  const hasData = dangerZoneData.some((d) => d.savePct !== null);
  if (!hasData) {
    return null;
  }

  // Prepare radar chart data
  // Normalize save percentages to a 0-100 scale where 100 represents "perfect" relative performance
  // We use a range from 0.80 to 1.00 (80% to 100% save %) mapped to 0-100 scale
  const minSvPct = 0.8;
  const maxSvPct = 1.0;
  const normalize = (svPct: number | null): number => {
    if (svPct === null) return 0;
    return Math.max(
      0,
      Math.min(100, ((svPct - minSvPct) / (maxSvPct - minSvPct)) * 100),
    );
  };

  const radarData = dangerZoneData.map((d) => ({
    zone: d.zone,
    goalie: normalize(d.savePct),
    league: normalize(d.leagueAvg),
    // Store raw values for tooltip
    goaliePct: formatPct(d.savePct),
    leaguePct: formatPct(d.leagueAvg),
    diff: formatDiff(d.difference),
    shots: d.shots,
    goals: d.goals,
    fullMark: 100,
  }));

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Danger Zone Performance</CardTitle>
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
              fillOpacity={0.15}
              strokeWidth={2}
              strokeDasharray="5 5"
            />
            <Radar
              name="Goalie"
              dataKey="goalie"
              stroke={CHART_COLOURS[0]}
              fill={CHART_COLOURS[0]}
              fillOpacity={0.5}
              strokeWidth={2}
            />
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
                <th className="text-left py-1.5 font-medium">Zone</th>
                <th className="text-right py-1.5 font-medium">Shots</th>
                <th className="text-right py-1.5 font-medium">SV%</th>
                <th className="text-right py-1.5 font-medium">vs Avg</th>
              </tr>
            </thead>
            <tbody>
              {dangerZoneData.map((d) => (
                <tr key={d.zone} className="border-b border-border/50">
                  <td className="py-1.5">{d.zone}</td>
                  <td className="text-right font-mono">{d.shots}</td>
                  <td className="text-right font-mono">
                    {formatPct(d.savePct)}
                  </td>
                  <td
                    className={`text-right font-mono ${
                      d.difference !== null && d.difference >= 0
                        ? "text-success"
                        : d.difference !== null && d.difference < 0
                          ? "text-error"
                          : ""
                    }`}
                  >
                    {formatDiff(d.difference)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-3">
          {leagueAverages
            ? "League averages computed from selected season(s) and situation"
            : "League averages shown are placeholders (league baseline unavailable)"}
        </p>
      </CardContent>
    </Card>
  );
}
