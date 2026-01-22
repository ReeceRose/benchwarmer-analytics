/**
 * Centralized chart color definitions for consistent styling across all visualizations.
 *
 * This module provides:
 * - CHART_COLORS: Primary palette for multi-series charts (5 distinct colors)
 * - CHART_AXIS_COLORS: Consistent axis, grid, and tick styling
 * - SHOT_DANGER_COLORS: Shot visualization danger zone colors
 * - HEATMAP_COLORS: Heat map gradient colors (low/medium/high)
 * - RINK_COLORS: Hockey rink element colors
 * - CHART_REFERENCE_COLOR: Reference line color
 */

/**
 * Primary chart color palette for multi-series visualizations.
 * Used for comparing players, metrics, or data series.
 * Colors are chosen for good contrast and accessibility.
 */
export const CHART_COLORS = [
  "#3b82f6", // blue-500
  "#22c55e", // green-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#8b5cf6", // violet-500
] as const;

/**
 * CSS variable-based chart colors for theme-aware charts.
 * Use these when you need colors that adapt to light/dark mode.
 */
export const CHART_COLORS_CSS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
] as const;

/**
 * Chart axis styling colors for consistent Recharts configuration.
 */
export const CHART_AXIS_COLORS = {
  /** Grid line color */
  grid: "#374151", // gray-700
  /** Tick label text color */
  tick: "#9ca3af", // gray-400
  /** Reference line color */
  reference: "#888888",
  /** Default grid/axis opacity */
  gridOpacity: 0.3,
} as const;

/**
 * Shot danger zone colors for rink visualizations.
 * Based on expected goal (xG) probability.
 */
export const SHOT_DANGER_COLORS = {
  /** Goal scored - green */
  goal: "#22c55e", // green-500
  /** High danger (xG > 15%) - orange */
  highDanger: "#f97316", // orange-500
  /** Medium danger (6-15% xG) - yellow */
  mediumDanger: "#eab308", // yellow-500
  /** Low danger (< 6% xG) - blue */
  lowDanger: "#3b82f6", // blue-500
} as const;

/**
 * Heat map gradient colors for zone-based visualizations.
 * RGB values for use with rgba() opacity.
 */
export const HEATMAP_COLORS = {
  /** Low intensity - blue */
  low: { r: 59, g: 130, b: 246 }, // blue-500
  /** Medium intensity - yellow */
  medium: { r: 234, g: 179, b: 8 }, // yellow-500
  /** High intensity - red */
  high: { r: 239, g: 68, b: 68 }, // red-500
} as const;

/**
 * Hockey rink element colors.
 */
export const RINK_COLORS = {
  /** Goal line - red */
  goalLine: "#dc2626", // red-600
  /** Blue line */
  blueLine: "#2563eb", // blue-600
  /** Crease fill */
  creaseFill: "#93c5fd", // blue-300
} as const;

/**
 * Chart gradient colors (for area charts).
 */
export const CHART_GRADIENT_COLORS = {
  /** Primary blue gradient */
  primary: "#3b82f6", // blue-500
  /** Danger/warning red gradient */
  danger: "#ef4444", // red-500
} as const;

/**
 * Chemistry matrix colors for player pair visualizations.
 */
export const CHEMISTRY_MATRIX_COLORS = {
  /** Diagonal cells (self) */
  diagonal: "hsl(0, 0%, 30%)",
  /** Empty cells (no data) */
  empty: "hsl(0, 0%, 15%)",
  /** Empty cell border */
  emptyBorder: "hsl(0, 0%, 25%)",
} as const;

/**
 * Get heat map color based on intensity value.
 * Returns rgba string for gradual color transitions.
 *
 * @param intensity - Value from 0 to 1
 * @param mode - 'xg' for blue->yellow->red, 'volume' for red intensity
 */
export function getHeatmapColor(
  intensity: number,
  mode: "xg" | "volume"
): string {
  if (intensity === 0) return "transparent";

  const clampedIntensity = Math.min(Math.max(intensity, 0), 1);

  if (mode === "xg") {
    const { low, medium, high } = HEATMAP_COLORS;
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
    const { high } = HEATMAP_COLORS;
    return `rgba(${high.r}, ${high.g}, ${high.b}, ${0.15 + clampedIntensity * 0.65})`;
  }
}

/**
 * Get chemistry heat color based on xG percentage.
 * Red (bad, 35%) -> Yellow (neutral, 50%) -> Green (good, 65%)
 *
 * @param xgPct - Expected goals percentage (0-100)
 * @param hasData - Whether data exists for this cell
 */
export function getChemistryHeatColor(
  xgPct: number | undefined | null,
  hasData: boolean
): string {
  if (!hasData || xgPct == null) return "transparent";

  // Clamp to 35-65 range for color scaling
  const clamped = Math.max(35, Math.min(65, xgPct));
  const normalized = (clamped - 35) / 30; // 0 to 1

  // Red (0°) -> Yellow (60°) -> Green (120°)
  const hue = normalized * 120;
  return `hsl(${hue}, 75%, 45%)`;
}

/**
 * Get shot color based on outcome and xG value.
 *
 * @param isGoal - Whether the shot resulted in a goal
 * @param xGoal - Expected goal probability (0-1)
 */
export function getShotColor(isGoal: boolean, xGoal: number): string {
  if (isGoal) return SHOT_DANGER_COLORS.goal;
  if (xGoal > 0.15) return SHOT_DANGER_COLORS.highDanger;
  if (xGoal >= 0.06) return SHOT_DANGER_COLORS.mediumDanger;
  return SHOT_DANGER_COLORS.lowDanger;
}
