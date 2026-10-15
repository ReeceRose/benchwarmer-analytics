import { formatToi } from "@/lib/formatters";

export type TrendMetric =
  | "avgGoalsPerGame"
  | "avgAssistsPerGame"
  | "avgToiPerGame"
  | "avgCorsiPct"
  | "avgXgPer60";

export const TREND_METRICS: Record<
  TrendMetric,
  { label: string; short: string; format: (v: number) => string; domain?: [number, number] }
> = {
  avgGoalsPerGame: { label: "Goals per team-game", short: "Goals", format: (v) => v.toFixed(2) },
  avgAssistsPerGame: { label: "Assists per team-game", short: "Assists", format: (v) => v.toFixed(2) },
  avgXgPer60: { label: "Expected goals per 60", short: "xG/60", format: (v) => v.toFixed(2) },
  avgToiPerGame: { label: "Average TOI per player-game", short: "TOI", format: (v) => formatToi(v) },
  avgCorsiPct: {
    label: "Average CF% (ice-time weighted)",
    short: "CF%",
    format: (v) => `${v.toFixed(1)}%`,
    domain: [45, 55],
  },
};
