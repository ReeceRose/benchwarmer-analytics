import type { HomeAwaySide } from "@/types";

export type HomeAwayMetricKey = {
  [K in keyof HomeAwaySide]: HomeAwaySide[K] extends number | null ? K : never;
}[keyof HomeAwaySide];

export interface HomeAwayMetric {
  key: HomeAwayMetricKey;
  label: string;
  format: (v: number) => string;
  lowerIsBetter?: boolean;
}

const fixed = (digits: number) => (v: number) => v.toFixed(digits);
const percent = (v: number) => `${v.toFixed(1)}%`;
const pointsPct = (v: number) => (v < 0 ? "-" : "") + Math.abs(v).toFixed(3).replace(/^0/, "");

export const HOME_AWAY_GROUPS: { title: string; metrics: HomeAwayMetric[] }[] = [
  {
    title: "All situations",
    metrics: [
      { key: "pointsPct", label: "Points %", format: pointsPct },
      { key: "goalsForPerGame", label: "Goals for / GP", format: fixed(2) },
      { key: "goalsAgainstPerGame", label: "Goals against / GP", format: fixed(2), lowerIsBetter: true },
      { key: "shotsForPerGame", label: "Shots for / GP", format: fixed(1) },
      { key: "shotsAgainstPerGame", label: "Shots against / GP", format: fixed(1), lowerIsBetter: true },
      { key: "faceoffPct", label: "Faceoff %", format: percent },
    ],
  },
  {
    title: "Special teams and discipline",
    metrics: [
      { key: "penaltiesDrawnPer60", label: "Penalties drawn / 60", format: fixed(2) },
      { key: "penaltiesTakenPer60", label: "Penalties taken / 60", format: fixed(2), lowerIsBetter: true },
      { key: "netPenaltiesPer60", label: "Penalty differential / 60", format: fixed(2) },
      { key: "ppMinutesPerGame", label: "PP minutes / GP", format: fixed(2) },
      { key: "pkMinutesPerGame", label: "PK minutes / GP", format: fixed(2), lowerIsBetter: true },
      { key: "ppGoalsPer60", label: "PP goals / 60", format: fixed(2) },
      { key: "pkGoalsAgainstPer60", label: "PK goals against / 60", format: fixed(2), lowerIsBetter: true },
    ],
  },
  {
    title: "5 on 5",
    metrics: [
      { key: "xGoalsPct", label: "xG %", format: percent },
      { key: "corsiPct", label: "Shot attempts %", format: percent },
      { key: "shootingPct", label: "Shooting %", format: percent },
      { key: "savePct", label: "Save %", format: percent },
    ],
  },
];

export const HOME_AWAY_METRICS = Object.fromEntries(
  HOME_AWAY_GROUPS.flatMap((g) => g.metrics.map((m) => [m.key, m])),
) as Record<HomeAwayMetricKey, HomeAwayMetric>;

export const HOME_AWAY_METRIC_KEYS = Object.keys(HOME_AWAY_METRICS) as [HomeAwayMetricKey, ...HomeAwayMetricKey[]];

export const formatPointsPct = pointsPct;

/** A value, or an en dash when there isn't one. */
export const showValue = (v: number | null, format: (v: number) => string) => (v == null ? "–" : format(v));

/**
 * How much better the team is at home than on the road, signed so positive
 * always means better at home (for goals against, fewer at home is better).
 */
export function homeEdge(metric: HomeAwayMetric, home: number | null, away: number | null): number | null {
  if (home == null || away == null) return null;
  return metric.lowerIsBetter ? away - home : home - away;
}

export function formatEdge(metric: HomeAwayMetric, edge: number | null): string {
  if (edge == null) return "–";
  const sign = edge > 0 ? "+" : edge < 0 ? "−" : "";
  return sign + metric.format(Math.abs(edge));
}
