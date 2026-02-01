/**
 * Centralised chart colour definitions for consistent styling across all visualisations.
 *
 * Hockey-inspired colour palette:
 * - Blue line blue: Primary chart colour
 * - Goal line red: Secondary/warning
 * - Goal light green: Success/goals
 * - Trophy gold: Highlights
 * - Ice blue/grey: Backgrounds and axes
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
 * Hockey-inspired colours for comparing players, metrics, or data series.
 */
export const CHART_COLOURS = [
  "#2563eb", // Blue line blue
  "#dc2626", // Goal line red
  "#16a34a", // Goal light green
  "#ca8a04", // Trophy gold
  "#7c3aed", // Violet (variety)
] as const;

// Legacy alias for backwards compatibility
export const CHART_COLORS = CHART_COLOURS;

/**
 * CSS variable-based chart colours for theme-aware charts.
 * Use these when you need colours that adapt to light/dark mode.
 */
export const CHART_COLOURS_CSS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

// Legacy alias
export const CHART_COLORS_CSS = CHART_COLOURS_CSS;

/**
 * Chart axis styling colours for consistent Recharts configuration.
 * Ice-inspired greys and blues.
 */
export const CHART_AXIS_COLOURS = {
  /** Grid line colour - ice grey */
  grid: "#64748b", // slate-500
  /** Tick label text colour */
  tick: "#94a3b8", // slate-400
  /** Reference line colour */
  reference: "#94a3b8",
  /** Default grid/axis opacity */
  gridOpacity: 0.3,
} as const;

// Legacy alias
export const CHART_AXIS_COLORS = CHART_AXIS_COLOURS;

/**
 * Shot danger zone colours for rink visualisations.
 * Based on expected goal (xG) probability.
 */
export const SHOT_DANGER_COLOURS = {
  /** Goal scored - goal light green */
  goal: "#16a34a", // green-600
  /** High danger (xG ≥ 20%) - warning orange */
  highDanger: "#ea580c", // orange-600
  /** Medium danger (8-20% xG) - caution amber */
  mediumDanger: "#d97706", // amber-600
  /** Low danger (< 8% xG) - blue line blue */
  lowDanger: "#2563eb", // blue-600
} as const;

// Legacy alias
export const SHOT_DANGER_COLORS = SHOT_DANGER_COLOURS;

/**
 * Heat map gradient colours for zone-based visualisations.
 * RGB values for use with rgba() opacity.
 * Cold (ice blue) -> Warm (amber) -> Hot (red)
 */
export const HEATMAP_COLOURS = {
  /** Low intensity - ice blue */
  low: { r: 37, g: 99, b: 235 }, // blue-600
  /** Medium intensity - amber */
  medium: { r: 217, g: 119, b: 6 }, // amber-600
  /** High intensity - goal red */
  high: { r: 220, g: 38, b: 38 }, // red-600
} as const;

// Legacy alias
export const HEATMAP_COLORS = HEATMAP_COLOURS;

/**
 * Hockey rink element colours.
 */
export const RINK_COLOURS = {
  /** Goal line - red */
  goalLine: "#dc2626", // red-600
  /** Blue line */
  blueLine: "#2563eb", // blue-600
  /** Crease fill - light blue */
  creaseFill: "#93c5fd", // blue-300
  /** Ice surface */
  ice: "#f0f9ff", // sky-50
  /** Centre ice red */
  centreRed: "#dc2626", // red-600
} as const;

// Legacy alias
export const RINK_COLORS = RINK_COLOURS;

/**
 * Chart gradient colours (for area charts).
 */
export const CHART_GRADIENT_COLOURS = {
  /** Primary blue gradient - blue line */
  primary: "#2563eb", // blue-600
  /** Danger/warning red gradient - goal line */
  danger: "#dc2626", // red-600
  /** Success green gradient - goal light */
  success: "#16a34a", // green-600
} as const;

// Legacy alias
export const CHART_GRADIENT_COLORS = CHART_GRADIENT_COLOURS;

/**
 * Chemistry matrix colours for player pair visualisations.
 */
export const CHEMISTRY_MATRIX_COLOURS = {
  /** Diagonal cells (self) - dark ice */
  diagonal: "hsl(220, 15%, 25%)",
  /** Empty cells (no data) - deep ice */
  empty: "hsl(220, 20%, 12%)",
  /** Empty cell border */
  emptyBorder: "hsl(220, 15%, 20%)",
} as const;

// Legacy alias
export const CHEMISTRY_MATRIX_COLORS = CHEMISTRY_MATRIX_COLOURS;

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

// Legacy alias
export const getHeatmapColor = getHeatmapColour;

/**
 * Get chemistry heat colour based on xG percentage.
 * Red (bad, 35%) -> Amber (neutral, 50%) -> Green (good, 65%)
 *
 * @param xgPct - Expected goals percentage (0-100)
 * @param hasData - Whether data exists for this cell
 */
export function getChemistryHeatColour(
  xgPct: number | undefined | null,
  hasData: boolean
): string {
  if (!hasData || xgPct == null) return "transparent";

  // Clamp to 35-65 range for colour scaling
  const clamped = Math.max(35, Math.min(65, xgPct));
  const normalised = (clamped - 35) / 30; // 0 to 1

  // Red (0°) -> Amber (45°) -> Green (120°)
  const hue = normalised * 120;
  return `hsl(${hue}, 75%, 45%)`;
}

// Legacy alias
export const getChemistryHeatColor = getChemistryHeatColour;

/**
 * Semantic chart colours for data visualisation.
 * Use these for consistent meaning across all charts.
 */
export const SEMANTIC_COLOURS = {
  /** Success/positive - goals, good performance */
  success: "hsl(142, 76%, 36%)",
  /** Danger/negative - against, poor performance */
  danger: "hsl(0, 72%, 51%)",
  /** Primary/home team - blue line */
  primary: "hsl(217, 91%, 60%)",
  /** Warning/caution - decline, attention needed */
  warning: "hsl(45, 93%, 47%)",
  /** Neutral/muted */
  muted: "#94a3b8",
} as const;

// Legacy alias
export const SEMANTIC_COLORS = SEMANTIC_COLOURS;

/**
 * Age curve phase colours for career trajectory visualisations.
 */
export const AGE_PHASE_COLOURS = {
  /** Development phase (18-23) */
  development: "hsl(217, 91%, 60%)",
  /** Prime years (24-29) */
  prime: "hsl(142, 76%, 36%)",
  /** Decline phase (30+) */
  decline: "hsl(45, 93%, 47%)",
} as const;

// Legacy alias
export const AGE_PHASE_COLORS = AGE_PHASE_COLOURS;

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

// Legacy alias
export const getShotColor = getShotColour;
