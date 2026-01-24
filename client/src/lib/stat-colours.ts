/**
 * Utility functions for determining stat display colours based on thresholds.
 * Colours indicate whether a stat value is "good" (success), "bad" (error), or neutral.
 *
 * Uses CSS variables for consistent theming:
 * - --success: Favourable stat (goal light colour)
 * - --error: Unfavourable stat (penalty colour)
 * - --warning: Caution/moderate (amber)
 */

interface ThresholdConfig {
  good: number;
  bad: number;
}

/**
 * Returns a Tailwind colour class based on whether a value exceeds thresholds.
 *
 * @param value - The stat value to evaluate
 * @param thresholds - { good, bad } - values above good are success, below bad are error
 * @param invert - If true, inverts the logic (lower is better, e.g., GAA)
 * @returns Tailwind colour class string
 */
export function getThresholdColour(
  value: number | null | undefined,
  thresholds: ThresholdConfig,
  invert = false
): string {
  if (value == null) return "text-muted-foreground";

  const { good, bad } = thresholds;

  if (invert) {
    // For stats where lower is better (e.g., GAA)
    if (value < bad) return "text-success";
    if (value > good) return "text-error";
  } else {
    // For stats where higher is better (e.g., xG%, CF%)
    if (value > good) return "text-success";
    if (value < bad) return "text-error";
  }

  return "text-foreground";
}

// Legacy alias
export const getThresholdColor = getThresholdColour;

// Preset thresholds for common hockey stats

/**
 * PDO colour - values near 100 are sustainable.
 * High PDO (>102) suggests regression coming (error).
 * Low PDO (<98) suggests improvement coming (success).
 */
export function getPdoColour(pdo: number | null | undefined): string {
  if (pdo == null) return "text-muted-foreground";
  // PDO is special - extreme values in either direction are unsustainable
  // High PDO = overperforming (likely to regress) = error
  // Low PDO = underperforming (room to improve) = success
  if (pdo > 102) return "text-error";
  if (pdo < 98) return "text-success";
  return "text-foreground";
}

// Legacy alias
export const getPdoColor = getPdoColour;

/**
 * Points differential colour - positive is overperforming (error), negative is underperforming (success).
 */
export function getPointsDiffColour(diff: number | null | undefined): string {
  if (diff == null) return "text-muted-foreground";
  if (diff > 5) return "text-error";
  if (diff < -5) return "text-success";
  return "text-muted-foreground";
}

// Legacy alias
export const getPointsDiffColor = getPointsDiffColour;

/**
 * Expected goals percentage colour - higher is better.
 */
export function getXgPctColour(xgPct: number | null | undefined): string {
  return getThresholdColour(xgPct, { good: 52, bad: 48 });
}

// Legacy alias
export const getXgPctColor = getXgPctColour;

/**
 * Corsi percentage colour - higher is better.
 */
export function getCorsiColour(corsi: number | null | undefined): string {
  return getThresholdColour(corsi, { good: 52, bad: 48 });
}

// Legacy alias
export const getCorsiColor = getCorsiColour;

/**
 * Save percentage colour - higher is better.
 * Expects value in percentage form (e.g., 91.5 for 91.5%).
 */
export function getSavePctColour(savePct: number | null | undefined): string {
  return getThresholdColour(savePct, { good: 91.5, bad: 90 });
}

// Legacy alias
export const getSavePctColor = getSavePctColour;

/**
 * Goals against average colour - lower is better.
 */
export function getGaaColour(gaa: number | null | undefined): string {
  return getThresholdColour(gaa, { good: 3.0, bad: 2.5 }, true);
}

// Legacy alias
export const getGaaColor = getGaaColour;

/**
 * Power play percentage colour - higher is better.
 * League average is around 20%.
 */
export function getPpPctColour(ppPct: number | null | undefined): string {
  return getThresholdColour(ppPct, { good: 23, bad: 17 });
}

// Legacy alias
export const getPpPctColor = getPpPctColour;

/**
 * Penalty kill percentage colour - higher is better.
 * League average is around 80%.
 */
export function getPkPctColour(pkPct: number | null | undefined): string {
  return getThresholdColour(pkPct, { good: 82, bad: 77 });
}

// Legacy alias
export const getPkPctColor = getPkPctColour;

/**
 * Goal differential colour - positive is good, negative is bad.
 */
export function getGoalDiffColour(diff: number | null | undefined): string {
  if (diff == null) return "text-muted-foreground";
  if (diff > 10) return "text-success";
  if (diff < -10) return "text-error";
  return "text-foreground";
}

// Legacy alias
export const getGoalDiffColor = getGoalDiffColour;

/**
 * Points percentage colour - higher is better.
 * Good teams are above .600, struggling teams below .450.
 */
export function getPointsPctColour(pct: number | null | undefined): string {
  if (pct == null) return "text-muted-foreground";
  if (pct > 0.6) return "text-success";
  if (pct < 0.45) return "text-error";
  return "text-foreground";
}

// Legacy alias
export const getPointsPctColor = getPointsPctColour;

/**
 * Shooting percentage colour - higher is better but extreme values regress.
 * League average is around 9-10%.
 */
export function getShootingPctColour(pct: number | null | undefined): string {
  if (pct == null) return "text-muted-foreground";
  if (pct > 11) return "text-success";
  if (pct < 8) return "text-error";
  return "text-foreground";
}

// Legacy alias
export const getShootingPctColor = getShootingPctColour;

/**
 * Fenwick percentage colour - higher is better.
 */
export function getFenwickColour(fenwick: number | null | undefined): string {
  return getThresholdColour(fenwick, { good: 52, bad: 48 });
}

// Legacy alias
export const getFenwickColor = getFenwickColour;

/**
 * Expected goal differential colour - positive is good, negative is bad.
 */
export function getXgDiffColour(diff: number | null | undefined): string {
  if (diff == null) return "text-muted-foreground";
  if (diff > 10) return "text-success";
  if (diff < -10) return "text-error";
  return "text-foreground";
}

// Legacy alias
export const getXgDiffColor = getXgDiffColour;
