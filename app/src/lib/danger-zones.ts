export const MONEYPUCK_DANGER_THRESHOLDS = {
  /** Medium danger: xG ≥ 0.08 */
  medium: 0.08,
  /** High danger: xG ≥ 0.20 */
  high: 0.2,
} as const;

export type DangerZone = "low" | "medium" | "high";

/**
 * MoneyPuck danger zones by xG probability on unblocked shot attempts:
 * - Low: xG < 0.08
 * - Medium: xG ≥ 0.08 and < 0.20
 * - High: xG ≥ 0.20
 */
export function getDangerZoneFromXg(xg: number | null | undefined): DangerZone {
  const v = xg ?? 0;
  if (v >= MONEYPUCK_DANGER_THRESHOLDS.high) return "high";
  if (v >= MONEYPUCK_DANGER_THRESHOLDS.medium) return "medium";
  return "low";
}

