import { useMemo } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_COLOURS } from "@/lib/chart-colours";
import type { SkaterStats } from "@/types";

type Summary = {
  pointsPer60: number | null;
  goalsPer60: number | null;
  assistsPer60: number | null;
  shotsPer60: number | null;
  xgPer60: number | null;
  corsiPct: number | null; // 0-100
  toiPerGame: number | null; // minutes
};

function aggregate(stats: SkaterStats[]): {
  gp: number;
  points: number;
  goals: number;
  assists: number;
  shots: number;
  xg: number;
  iceTimeSeconds: number;
  corsiWeightedSum: number;
  corsiWeight: number;
} {
  return stats.reduce(
    (acc, s) => {
      acc.gp += s.gamesPlayed;
      acc.points += s.points;
      acc.goals += s.goals;
      acc.assists += s.assists;
      acc.shots += s.shots;
      acc.xg += s.expectedGoals ?? 0;
      acc.iceTimeSeconds += s.iceTimeSeconds;
      if (s.corsiForPct != null) {
        acc.corsiWeightedSum += s.corsiForPct * s.iceTimeSeconds;
        acc.corsiWeight += s.iceTimeSeconds;
      }
      return acc;
    },
    {
      gp: 0,
      points: 0,
      goals: 0,
      assists: 0,
      shots: 0,
      xg: 0,
      iceTimeSeconds: 0,
      corsiWeightedSum: 0,
      corsiWeight: 0,
    }
  );
}

function toSummary(agg: ReturnType<typeof aggregate>): Summary {
  const hours = agg.iceTimeSeconds > 0 ? agg.iceTimeSeconds / 3600 : 0;
  const pointsPer60 = hours > 0 ? agg.points / hours : null;
  const goalsPer60 = hours > 0 ? agg.goals / hours : null;
  const assistsPer60 = hours > 0 ? agg.assists / hours : null;
  const shotsPer60 = hours > 0 ? agg.shots / hours : null;
  const xgPer60 = hours > 0 ? agg.xg / hours : null;
  const corsiPct = agg.corsiWeight > 0 ? (agg.corsiWeightedSum / agg.corsiWeight) * 100 : null;
  const toiPerGame = agg.gp > 0 ? agg.iceTimeSeconds / agg.gp / 60 : null;
  return { pointsPer60, goalsPer60, assistsPer60, shotsPer60, xgPer60, corsiPct, toiPerGame };
}

type MetricDef = {
  key: keyof Summary;
  label: string;
  max?: number;
  format: (v: number) => string;
};

const METRICS: MetricDef[] = [
  { key: "pointsPer60", label: "Points/60", format: (v) => v.toFixed(2) },
  { key: "goalsPer60", label: "Goals/60", format: (v) => v.toFixed(2) },
  { key: "assistsPer60", label: "Assists/60", format: (v) => v.toFixed(2) },
  { key: "shotsPer60", label: "Shots/60", format: (v) => v.toFixed(1) },
  { key: "xgPer60", label: "xG/60", format: (v) => v.toFixed(2) },
  { key: "corsiPct", label: "CF%", max: 70, format: (v) => `${v.toFixed(1)}%` },
  { key: "toiPerGame", label: "TOI/GP", format: (v) => `${v.toFixed(1)}m` },
];

function normalize(value: number | null, maxValue: number): number {
  if (value == null || !Number.isFinite(value) || maxValue <= 0) return 0;
  return Math.min(100, (value / maxValue) * 100);
}

function RadarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: Record<string, string | number> }>;
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;

  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold mb-2">{row.stat}</p>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Current season</span>
          <span className="font-mono font-semibold">{row.current_raw}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Career</span>
          <span className="font-mono font-semibold">{row.career_raw}</span>
        </div>
      </div>
    </div>
  );
}

export function SeasonComparisonRadar({
  stats,
  season,
}: {
  stats: SkaterStats[];
  season: number;
}) {
  const { current, career } = useMemo(() => {
    const regularAll = stats.filter((s) => !s.isPlayoffs && s.situation === "all");
    const currentSeason = regularAll.filter((s) => s.season === season);
    const careerAgg = aggregate(regularAll);
    const currentAgg = aggregate(currentSeason);
    return { current: toSummary(currentAgg), career: toSummary(careerAgg) };
  }, [stats, season]);

  const radarData = useMemo(() => {
    return METRICS.map((m) => {
      const c = current[m.key];
      const k = career[m.key];
      const max =
        m.max ??
        Math.max(
          0,
          c != null && Number.isFinite(c) ? c : 0,
          k != null && Number.isFinite(k) ? k : 0
        );

      return {
        stat: m.label,
        current: normalize(c, max),
        career: normalize(k, max),
        current_raw: c != null ? m.format(c) : "-",
        career_raw: k != null ? m.format(k) : "-",
        fullMark: 100,
      };
    });
  }, [current, career]);

  const hasAny =
    radarData.some((d) => d.current_raw !== "-") || radarData.some((d) => d.career_raw !== "-");
  if (!hasAny) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Season vs Career Radar</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <RadarChart
            data={radarData}
            cx="50%"
            cy="50%"
            outerRadius="70%"
            margin={{ top: 10, right: 20, bottom: 10, left: 20 }}
          >
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
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />

            <Radar
              name="Current season"
              dataKey="current"
              stroke={CHART_COLOURS[0]}
              fill={CHART_COLOURS[0]}
              fillOpacity={0.15}
              strokeWidth={2}
            />
            <Radar
              name="Career"
              dataKey="career"
              stroke={CHART_COLOURS[2]}
              fill={CHART_COLOURS[2]}
              fillOpacity={0.12}
              strokeWidth={2}
            />

            <Tooltip
              content={<RadarTooltip />}
              wrapperStyle={{ outline: "none", background: "transparent", border: "none" }}
            />
          </RadarChart>
        </ResponsiveContainer>

        <div
          className="mt-2 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground"
          aria-label="Radar legend"
        >
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ backgroundColor: CHART_COLOURS[0] }}
            />
            <span>Current season</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ backgroundColor: CHART_COLOURS[2] }}
            />
            <span>Career</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2">
          Values normalized per metric (0–100), tooltip shows raw values.
        </p>
      </CardContent>
    </Card>
  );
}

