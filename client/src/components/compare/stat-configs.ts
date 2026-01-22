import { formatToi, formatPercent, formatPer60 } from "@/lib/formatters";
import type { SkaterStats, GoalieStats, PlayerComparison } from "@/types";

// Stat mode for filtering
export type StatMode = "all" | "counting" | "rate";

// Skater stats configuration
export interface SkaterStatConfig {
  key: keyof SkaterStats | "pointsPerGame" | "goalsPer60" | "assistsPer60";
  label: string;
  format: (value: number | undefined | null, stats?: SkaterStats) => string;
  higherIsBetter: boolean;
  mode: "counting" | "rate" | "context"; // context = always shown (GP, TOI)
}

export const SKATER_STAT_CONFIGS: SkaterStatConfig[] = [
  {
    key: "gamesPlayed",
    label: "GP",
    format: (v) => (v != null ? String(v) : "-"),
    higherIsBetter: true,
    mode: "context",
  },
  {
    key: "goals",
    label: "G",
    format: (v) => (v != null ? String(v) : "-"),
    higherIsBetter: true,
    mode: "counting",
  },
  {
    key: "assists",
    label: "A",
    format: (v) => (v != null ? String(v) : "-"),
    higherIsBetter: true,
    mode: "counting",
  },
  {
    key: "points",
    label: "P",
    format: (v) => (v != null ? String(v) : "-"),
    higherIsBetter: true,
    mode: "counting",
  },
  {
    key: "pointsPerGame",
    label: "P/GP",
    format: (_, stats) =>
      stats && stats.gamesPlayed > 0
        ? (stats.points / stats.gamesPlayed).toFixed(2)
        : "-",
    higherIsBetter: true,
    mode: "rate",
  },
  {
    key: "iceTimeSeconds",
    label: "TOI",
    format: (v) => (v != null ? formatToi(v) : "-"),
    higherIsBetter: true,
    mode: "context",
  },
  {
    key: "shots",
    label: "S",
    format: (v) => (v != null ? String(v) : "-"),
    higherIsBetter: true,
    mode: "counting",
  },
  {
    key: "expectedGoals",
    label: "xG",
    format: (v) => (v != null ? v.toFixed(1) : "-"),
    higherIsBetter: true,
    mode: "counting",
  },
  {
    key: "goalsPer60",
    label: "G/60",
    format: (_, stats) =>
      stats && stats.iceTimeSeconds > 0
        ? formatPer60(stats.goals, stats.iceTimeSeconds)
        : "-",
    higherIsBetter: true,
    mode: "rate",
  },
  {
    key: "expectedGoalsPer60",
    label: "xG/60",
    format: (_, stats) =>
      stats && stats.iceTimeSeconds > 0 && stats.expectedGoals != null
        ? ((stats.expectedGoals / stats.iceTimeSeconds) * 3600).toFixed(2)
        : "-",
    higherIsBetter: true,
    mode: "rate",
  },
  {
    key: "corsiForPct",
    label: "CF%",
    format: (v) => (v != null ? formatPercent(v) : "-"),
    higherIsBetter: true,
    mode: "rate",
  },
  {
    key: "fenwickForPct",
    label: "FF%",
    format: (v) => (v != null ? formatPercent(v) : "-"),
    higherIsBetter: true,
    mode: "rate",
  },
];

// Goalie stats configuration
export interface GoalieStatConfig {
  key: keyof GoalieStats | "savePctDisplay";
  label: string;
  format: (value: number | undefined | null, stats?: GoalieStats) => string;
  higherIsBetter: boolean;
  mode: "counting" | "rate" | "context";
}

export const GOALIE_STAT_CONFIGS: GoalieStatConfig[] = [
  {
    key: "gamesPlayed",
    label: "GP",
    format: (v) => (v != null ? String(v) : "-"),
    higherIsBetter: true,
    mode: "context",
  },
  {
    key: "iceTimeSeconds",
    label: "TOI",
    format: (v) => (v != null ? formatToi(v) : "-"),
    higherIsBetter: true,
    mode: "context",
  },
  {
    key: "shotsAgainst",
    label: "SA",
    format: (v) => (v != null ? String(v) : "-"),
    higherIsBetter: false,
    mode: "counting",
  },
  {
    key: "goalsAgainst",
    label: "GA",
    format: (v) => (v != null ? String(v) : "-"),
    higherIsBetter: false,
    mode: "counting",
  },
  {
    key: "savePctDisplay",
    label: "SV%",
    format: (_, stats) =>
      stats?.savePercentage != null
        ? (stats.savePercentage * 100).toFixed(2) + "%"
        : "-",
    higherIsBetter: true,
    mode: "rate",
  },
  {
    key: "goalsAgainstAverage",
    label: "GAA",
    format: (v) => (v != null ? v.toFixed(2) : "-"),
    higherIsBetter: false,
    mode: "rate",
  },
  {
    key: "goalsSavedAboveExpected",
    label: "GSAE",
    format: (v) => (v != null ? v.toFixed(1) : "-"),
    higherIsBetter: true,
    mode: "rate",
  },
  {
    key: "expectedGoalsAgainst",
    label: "xGA",
    format: (v) => (v != null ? v.toFixed(1) : "-"),
    higherIsBetter: false,
    mode: "counting",
  },
  {
    key: "highDangerShots",
    label: "HD SA",
    format: (v) => (v != null ? String(v) : "-"),
    higherIsBetter: false,
    mode: "counting",
  },
  {
    key: "highDangerGoals",
    label: "HD GA",
    format: (v) => (v != null ? String(v) : "-"),
    higherIsBetter: false,
    mode: "counting",
  },
];

// Filter stats by mode
export function filterStatsByMode<T extends { mode: "counting" | "rate" | "context" }>(
  configs: T[],
  mode: StatMode
): T[] {
  if (mode === "all") return configs;
  return configs.filter((c) => c.mode === mode || c.mode === "context");
}

// Stat value result with highlighting info
export interface StatValueResult {
  formatted: string;
  isBest: boolean;
  isWorst: boolean;
}

// Get skater stat value with highlighting
export function getSkaterStatValue(
  config: SkaterStatConfig,
  player: PlayerComparison,
  allPlayers: PlayerComparison[]
): StatValueResult {
  const stats = player.stats;
  let value: number | undefined | null;

  if (
    config.key === "pointsPerGame" ||
    config.key === "goalsPer60" ||
    config.key === "assistsPer60"
  ) {
    value = undefined;
  } else {
    value = stats?.[config.key as keyof SkaterStats] as number | undefined | null;
  }

  const formatted = config.format(value, stats);

  const allValues = allPlayers
    .map((p) => {
      const s = p.stats;
      if (!s) return null;
      if (config.key === "pointsPerGame")
        return s.gamesPlayed > 0 ? s.points / s.gamesPlayed : null;
      if (config.key === "goalsPer60")
        return s.iceTimeSeconds > 0 ? (s.goals / s.iceTimeSeconds) * 3600 : null;
      if (config.key === "assistsPer60")
        return s.iceTimeSeconds > 0 ? (s.assists / s.iceTimeSeconds) * 3600 : null;
      return s[config.key as keyof SkaterStats] as number | null;
    })
    .filter((v): v is number => v != null);

  if (allValues.length === 0) {
    return { formatted, isBest: false, isWorst: false };
  }

  const best = config.higherIsBetter ? Math.max(...allValues) : Math.min(...allValues);
  const worst = config.higherIsBetter ? Math.min(...allValues) : Math.max(...allValues);

  let currentValue: number | null = null;
  if (stats) {
    if (config.key === "pointsPerGame")
      currentValue = stats.gamesPlayed > 0 ? stats.points / stats.gamesPlayed : null;
    else if (config.key === "goalsPer60")
      currentValue = stats.iceTimeSeconds > 0 ? (stats.goals / stats.iceTimeSeconds) * 3600 : null;
    else if (config.key === "assistsPer60")
      currentValue = stats.iceTimeSeconds > 0 ? (stats.assists / stats.iceTimeSeconds) * 3600 : null;
    else currentValue = stats[config.key as keyof SkaterStats] as number | null;
  }

  const hasVariation = best !== worst;
  return {
    formatted,
    isBest: currentValue === best && allValues.length > 1 && hasVariation,
    isWorst: currentValue === worst && allValues.length > 1 && hasVariation,
  };
}

// Get goalie stat value with highlighting
export function getGoalieStatValue(
  config: GoalieStatConfig,
  player: PlayerComparison,
  allPlayers: PlayerComparison[]
): StatValueResult {
  const stats = player.goalieStats;
  let value: number | undefined | null;

  if (config.key === "savePctDisplay") {
    value = undefined;
  } else {
    value = stats?.[config.key as keyof GoalieStats] as number | undefined | null;
  }

  const formatted = config.format(value, stats);

  const allValues = allPlayers
    .map((p) => {
      const s = p.goalieStats;
      if (!s) return null;
      if (config.key === "savePctDisplay") return s.savePercentage ?? null;
      return s[config.key as keyof GoalieStats] as number | null;
    })
    .filter((v): v is number => v != null);

  if (allValues.length === 0) {
    return { formatted, isBest: false, isWorst: false };
  }

  const best = config.higherIsBetter ? Math.max(...allValues) : Math.min(...allValues);
  const worst = config.higherIsBetter ? Math.min(...allValues) : Math.max(...allValues);

  let currentValue: number | null = null;
  if (stats) {
    if (config.key === "savePctDisplay") currentValue = stats.savePercentage ?? null;
    else currentValue = stats[config.key as keyof GoalieStats] as number | null;
  }

  const hasVariation = best !== worst;
  return {
    formatted,
    isBest: currentValue === best && allValues.length > 1 && hasVariation,
    isWorst: currentValue === worst && allValues.length > 1 && hasVariation,
  };
}
