import { getDangerZoneFromXg, MONEYPUCK_DANGER_THRESHOLDS } from "@/lib/danger-zones";
import type { DangerLevel, Shot, ShotSummary } from "@/types";

/** Danger-level filter options, labelled with the MoneyPuck thresholds. */
export const DANGER_LEVEL_OPTIONS: { value: DangerLevel; label: string }[] = [
  { value: "all", label: "All danger levels" },
  { value: "high", label: "High danger (xG 20%+)" },
  { value: "medium-high", label: "Medium and high (xG 8%+)" },
  { value: "low", label: "Low danger (xG under 8%)" },
];

/** Keeps the shots in a danger level. Applied client-side, after the API filters. */
export function filterShotsByDanger(shots: Shot[], level: DangerLevel): Shot[] {
  if (level === "all") return shots;
  return shots.filter((shot) => {
    const xg = shot.xGoal ?? 0;
    if (level === "high") return xg >= MONEYPUCK_DANGER_THRESHOLDS.high;
    if (level === "medium-high") return xg >= MONEYPUCK_DANGER_THRESHOLDS.medium;
    return xg < MONEYPUCK_DANGER_THRESHOLDS.medium;
  });
}

/** The API's shot summary, recomputed so it matches client-side filters. */
export function summariseShots(shots: Shot[]): ShotSummary {
  const totalShots = shots.length;
  const goals = shots.filter((s) => s.isGoal).length;
  const totalXGoal = shots.reduce((sum, s) => sum + (s.xGoal ?? 0), 0);
  const zones = shots.map((s) => getDangerZoneFromXg(s.xGoal));
  return {
    totalShots,
    goals,
    shotsOnGoal: shots.filter((s) => s.shotWasOnGoal).length,
    shootingPct: totalShots > 0 ? (goals / totalShots) * 100 : 0,
    totalXGoal,
    goalsAboveExpected: goals - totalXGoal,
    highDangerShots: zones.filter((z) => z === "high").length,
    mediumDangerShots: zones.filter((z) => z === "medium").length,
    lowDangerShots: zones.filter((z) => z === "low").length,
  };
}

export interface ShooterTotals {
  playerId: number;
  name: string;
  position?: string;
  shots: number;
  goals: number;
  xGoal: number;
}

/** Shot totals per shooter, most expected goals first. */
export function summariseShooters(shots: Shot[]): ShooterTotals[] {
  const byShooter = new Map<number, ShooterTotals>();
  for (const shot of shots) {
    if (shot.shooterPlayerId == null) continue;
    let totals = byShooter.get(shot.shooterPlayerId);
    if (!totals) {
      totals = {
        playerId: shot.shooterPlayerId,
        name: shot.shooterName ?? "Unknown",
        position: shot.shooterPosition ?? undefined,
        shots: 0,
        goals: 0,
        xGoal: 0,
      };
      byShooter.set(shot.shooterPlayerId, totals);
    }
    totals.shots++;
    totals.xGoal += shot.xGoal ?? 0;
    if (shot.isGoal) totals.goals++;
  }
  return [...byShooter.values()].sort((a, b) => b.xGoal - a.xGoal || b.goals - a.goals);
}

/** "+1.2" / "-0.4" for a goals-minus-xG style differential. */
export function formatSigned(value: number, digits = 1): string {
  const text = value.toFixed(digits);
  return value > 0 ? `+${text}` : text;
}

/**
 * Places NHL coordinates (x -100..100, goal lines at ±89) on the half rink.
 * Shots can be at either end, so the net is the one the shot distance
 * matches; shots at the left-hand net are rotated 180° (not mirrored) to keep
 * the shooter's side of the ice. Shots from behind centre land past x = 100,
 * off the drawn zone.
 */
export function toHalfRink(x: number, y: number, distance?: number): { x: number; y: number } {
  let netX = x < 0 ? -89 : 89;
  if (distance != null) {
    const near = Math.abs(Math.hypot(netX - x, y) - distance);
    const far = Math.abs(Math.hypot(-netX - x, y) - distance);
    if (far < near) netX = -netX;
  }
  const flip = netX < 0;
  const fromGoalLine = flip ? x + 89 : 89 - x;
  return { x: 11 + fromGoalLine, y: Math.max(-42.5, Math.min(42.5, flip ? -y : y)) };
}
