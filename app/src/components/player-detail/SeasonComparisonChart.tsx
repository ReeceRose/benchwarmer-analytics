import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComparisonBars, type ComparisonRow } from "@/components/charts/ComparisonBars";
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
  format: (v: number) => string;
  extra?: Partial<ComparisonRow>;
};

const METRICS: MetricDef[] = [
  { key: "pointsPer60", label: "Points/60", format: (v) => v.toFixed(2) },
  { key: "goalsPer60", label: "Goals/60", format: (v) => v.toFixed(2) },
  { key: "assistsPer60", label: "Assists/60", format: (v) => v.toFixed(2) },
  { key: "shotsPer60", label: "Shots/60", format: (v) => v.toFixed(1) },
  { key: "xgPer60", label: "xG/60", format: (v) => v.toFixed(2) },
  {
    key: "corsiPct",
    label: "Shot share (CF%)",
    format: (v) => `${v.toFixed(1)}%`,
    extra: { domain: [35, 65], reference: { value: 50, label: "Even" } },
  },
  { key: "toiPerGame", label: "Ice time per game", format: (v) => `${v.toFixed(1)}m`, extra: { neutral: true } },
];

/** This season next to career rates, per 60 minutes so seasons of any length compare. */
export function SeasonComparisonChart({
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

  const rows: ComparisonRow[] = METRICS.map((m) => ({
    label: m.label,
    values: [current[m.key], career[m.key]],
    format: m.format,
    ...m.extra,
  }));
  if (!rows.some((r) => r.values.some((v) => v != null))) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">This season vs career</CardTitle>
      </CardHeader>
      <CardContent>
        <ComparisonBars
          series={[
            { name: "This season", colour: CHART_COLOURS[0] },
            { name: "Career", colour: "var(--muted-foreground)" },
          ]}
          rows={rows}
        />
      </CardContent>
    </Card>
  );
}
