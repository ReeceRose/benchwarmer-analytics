/**
 * Utility functions for determining stat display colors based on thresholds.
 * Colors indicate whether a stat value is "good" (green), "bad" (red), or neutral.
 */

interface ThresholdConfig {
  good: number;
  bad: number;
}

/**
 * Returns a Tailwind color class based on whether a value exceeds thresholds.
 *
 * @param value - The stat value to evaluate
 * @param thresholds - { good, bad } - values above good are green, below bad are red
 * @param invert - If true, inverts the logic (lower is better, e.g., GAA)
 * @returns Tailwind color class string
 */
export function getThresholdColor(
  value: number | null | undefined,
  thresholds: ThresholdConfig,
  invert = false
): string {
  if (value == null) return "text-muted-foreground";

  const { good, bad } = thresholds;

  if (invert) {
    // For stats where lower is better (e.g., GAA)
    if (value < bad) return "text-green-500";
    if (value > good) return "text-red-500";
  } else {
    // For stats where higher is better (e.g., xG%, CF%)
    if (value > good) return "text-green-500";
    if (value < bad) return "text-red-500";
  }

  return "text-foreground";
}

// Preset thresholds for common hockey stats

/**
 * PDO color - values near 100 are sustainable.
 * High PDO (>102) suggests regression coming (red).
 * Low PDO (<98) suggests improvement coming (green).
 */
export function getPdoColor(pdo: number | null | undefined): string {
  if (pdo == null) return "text-muted-foreground";
  // PDO is special - extreme values in either direction are unsustainable
  // High PDO = overperforming (likely to regress) = red
  // Low PDO = underperforming (room to improve) = green
  if (pdo > 102) return "text-red-500";
  if (pdo < 98) return "text-green-500";
  return "text-foreground";
}

/**
 * Points differential color - positive is overperforming (red), negative is underperforming (green).
 */
export function getPointsDiffColor(diff: number | null | undefined): string {
  if (diff == null) return "text-muted-foreground";
  if (diff > 5) return "text-red-500";
  if (diff < -5) return "text-green-500";
  return "text-muted-foreground";
}

/**
 * Expected goals percentage color - higher is better.
 */
export function getXgPctColor(xgPct: number | null | undefined): string {
  return getThresholdColor(xgPct, { good: 52, bad: 48 });
}

/**
 * Corsi percentage color - higher is better.
 */
export function getCorsiColor(corsi: number | null | undefined): string {
  return getThresholdColor(corsi, { good: 52, bad: 48 });
}

/**
 * Save percentage color - higher is better.
 */
export function getSavePctColor(savePct: number | null | undefined): string {
  return getThresholdColor(savePct, { good: 0.915, bad: 0.900 });
}

/**
 * Goals against average color - lower is better.
 */
export function getGaaColor(gaa: number | null | undefined): string {
  return getThresholdColor(gaa, { good: 3.0, bad: 2.5 }, true);
}
