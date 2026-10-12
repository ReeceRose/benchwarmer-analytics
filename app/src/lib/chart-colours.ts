/**
 * Centralised chart colour definitions for consistent styling across all visualisations.
 *
 * Series and semantic colours resolve to the theme's CSS variables (see
 * index.css), so charts follow light/dark mode. Rink and heat map colours are
 * fixed hex values from the same palette.
 *
 * This module provides:
 * - CHART_COLOURS: Primary palette for multi-series charts (5 distinct colours)
 * - CHART_AXIS_COLOURS: Consistent axis, grid, and tick styling
 * - SHOT_DANGER_COLOURS: Shot visualisation danger zone colours
 * - HEATMAP_COLOURS: Heat map gradient colours (low/medium/high)
 * - RINK_COLOURS: Hockey rink element colours
 */

import { getDangerZoneFromXg } from "@/lib/danger-zones";

/**
 * Primary chart colour palette for multi-series visualisations.
 * Blue, red, green, amber, violet.
 */
export const CHART_COLOURS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

/**
 * Chart axis styling colours for consistent Recharts configuration.
 * Quiet, theme-aware chrome.
 */
export const CHART_AXIS_COLOURS = {
  /** Grid and axis line colour */
  grid: "var(--border)",
  /** Tick label text colour */
  tick: "var(--muted-foreground)",
  /** Reference line colour */
  reference: "var(--muted-foreground)",
  /** Default grid/axis opacity */
  gridOpacity: 1,
} as const;

/**
 * Shot danger zone colours for rink visualisations, from the chart palette
 * so they brighten in dark mode. Based on expected goal (xG) probability.
 */
export const SHOT_DANGER_COLOURS = {
  /** Goal scored - green */
  goal: "var(--chart-3)",
  /** High danger - red */
  highDanger: "var(--chart-2)",
  /** Medium danger - amber */
  mediumDanger: "var(--chart-4)",
  /** Low danger - blue */
  lowDanger: "var(--chart-1)",
} as const;

/**
 * Heat map gradient colours for zone-based visualisations.
 * RGB values for use with rgba() opacity.
 * Cold (blue) -> Warm (amber) -> Hot (red)
 */
export const HEATMAP_COLOURS = {
  /** Low intensity - blue */
  low: { r: 37, g: 99, b: 235 }, // #2563eb
  /** Medium intensity - amber */
  medium: { r: 245, g: 158, b: 11 }, // #f59e0b
  /** High intensity - red */
  high: { r: 229, g: 72, b: 77 }, // #e5484d
} as const;

/**
 * Hockey rink element colours.
 */
export const RINK_COLOURS = {
  /** Goal line - red */
  goalLine: "#e5484d",
  /** Blue line */
  blueLine: "#2563eb",
  /** Crease fill - pale blue */
  creaseFill: "#bfd3fb",
  /** Ice surface */
  ice: "#ffffff",
  /** Centre ice - red */
  centreRed: "#e5484d",
} as const;

/**
 * Chart gradient colours (for area charts).
 */
export const CHART_GRADIENT_COLOURS = {
  /** Primary blue gradient - blue line */
  primary: "var(--chart-1)",
  /** Danger/warning red gradient - goal light */
  danger: "var(--chart-2)",
  /** Success green gradient - glass green */
  success: "var(--chart-3)",
} as const;

/**
 * Chemistry matrix colours for player pair visualisations.
 */
export const CHEMISTRY_MATRIX_COLOURS = {
  /** Diagonal cells (self) */
  diagonal: "var(--muted-foreground)",
  /** Empty cells (no data) */
  empty: "transparent",
  /** Empty cell border */
  emptyBorder: "var(--border)",
} as const;

/**
 * Get heat map colour based on intensity value.
 * Returns rgba string for gradual colour transitions.
 *
 * @param intensity - Value from 0 to 1
 * @param mode - 'xg' for blue->amber->red, 'volume' for red intensity
 */
export function getHeatmapColour(
  intensity: number,
  mode: "xg" | "volume"
): string {
  if (intensity === 0) return "transparent";

  const clampedIntensity = Math.min(Math.max(intensity, 0), 1);

  if (mode === "xg") {
    const { low, medium, high } = HEATMAP_COLOURS;
    if (clampedIntensity < 0.33) {
      const t = clampedIntensity / 0.33;
      return `rgba(${low.r}, ${low.g}, ${low.b}, ${0.2 + t * 0.3})`;
    } else if (clampedIntensity < 0.66) {
      const t = (clampedIntensity - 0.33) / 0.33;
      return `rgba(${medium.r}, ${medium.g}, ${medium.b}, ${0.3 + t * 0.4})`;
    } else {
      const t = (clampedIntensity - 0.66) / 0.34;
      return `rgba(${high.r}, ${high.g}, ${high.b}, ${0.4 + t * 0.5})`;
    }
  } else {
    const { high } = HEATMAP_COLOURS;
    return `rgba(${high.r}, ${high.g}, ${high.b}, ${0.15 + clampedIntensity * 0.65})`;
  }
}

/**
 * Get chemistry heat colour based on xG percentage: goal-light red (35%)
 * through a neutral card tint (50%) to glass green (65%). Mixed with the card
 * colour so it sits well in both themes.
 *
 * @param xgPct - Expected goals percentage (0-100)
 * @param hasData - Whether data exists for this cell
 */
export function getChemistryHeatColour(
  xgPct: number | undefined | null,
  hasData: boolean
): string {
  if (!hasData || xgPct == null) return "transparent";

  const clamped = Math.max(35, Math.min(65, xgPct));
  const strength = Math.round((Math.abs(clamped - 50) / 15) * 85) + 12;
  const hue = clamped >= 50 ? SHOT_DANGER_COLOURS.goal : SHOT_DANGER_COLOURS.highDanger;
  return `color-mix(in oklab, ${hue} ${strength}%, var(--muted))`;
}

/**
 * Text colour for a chemistry cell: the card colour on strong fills (light
 * text in light mode, dark text on dark mode's brighter fills), ink otherwise.
 */
export function getChemistryTextColour(xgPct: number | undefined | null): string {
  if (xgPct == null) return "var(--foreground)";
  return Math.abs(xgPct - 50) >= 8 ? "var(--card)" : "var(--foreground)";
}

/**
 * Semantic chart colours for data visualisation.
 * Use these for consistent meaning across all charts.
 */
export const SEMANTIC_COLOURS = {
  /** Success/positive - goals, good performance */
  success: "var(--chart-3)",
  /** Danger/negative - against, poor performance */
  danger: "var(--chart-2)",
  /** Primary/home team - blue line */
  primary: "var(--chart-1)",
  /** Warning/caution - decline, attention needed */
  warning: "var(--chart-4)",
  /** Neutral/muted */
  muted: "var(--muted-foreground)",
} as const;

/**
 * Age curve phase colours for career trajectory visualisations.
 */
export const AGE_PHASE_COLOURS = {
  /** Development phase (18-23) */
  development: "var(--chart-1)",
  /** Prime years (24-29) */
  prime: "var(--chart-3)",
  /** Decline phase (30+) */
  decline: "var(--chart-4)",
} as const;

/**
 * Get shot colour based on outcome and xG value.
 *
 * @param isGoal - Whether the shot resulted in a goal
 * @param xGoal - Expected goal probability (0-1)
 */
export function getShotColour(isGoal: boolean, xGoal: number): string {
  if (isGoal) return SHOT_DANGER_COLOURS.goal;

  const zone = getDangerZoneFromXg(xGoal);
  if (zone === "high") return SHOT_DANGER_COLOURS.highDanger;
  if (zone === "medium") return SHOT_DANGER_COLOURS.mediumDanger;
  return SHOT_DANGER_COLOURS.lowDanger;
}
