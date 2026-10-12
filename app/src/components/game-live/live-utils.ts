import type { LiveGameResponse, TeamSide } from "@/types";

export const SIDES: readonly TeamSide[] = ["away", "home"];

/** Away is red, home is blue, everywhere in the game centre. */
export const teamColour = (side: TeamSide) => (side === "away" ? "var(--chart-2)" : "var(--chart-1)");
export const teamTint = (side: TeamSide, percent = 14) =>
  `color-mix(in srgb, ${teamColour(side)} ${percent}%, transparent)`;

export const opposite = (side: TeamSide): TeamSide => (side === "away" ? "home" : "away");

export function periodName(period: number): string {
  if (period <= 3) return ["1st", "2nd", "3rd"][period - 1];
  return period === 4 ? "OT" : `${period - 3}OT`;
}

export function mmss(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** "2nd 13:41" for a game-seconds value. */
export function gameClock(t: number): string {
  if (t > 0 && t % 1200 === 0) return `end of ${periodName(t / 1200)}`;
  return `${periodName(Math.floor(t / 1200) + 1)} ${mmss(t % 1200)}`;
}

export function fmt(value: number | null | undefined, digits = 0): string {
  return value == null || Number.isNaN(value) ? "–" : value.toFixed(digits);
}

export function share(a: number, b: number): number | null {
  return a + b > 0 ? (100 * a) / (a + b) : null;
}

export function signed(value: number, digits = 0): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}`;
}

/** Game length to draw on time axes: regulation, or longer once overtime starts. */
export function timelineEnd(data: LiveGameResponse): number {
  return Math.max(3600, Math.ceil(data.meta.elapsedSeconds / 1200) * 1200);
}

export function titleCase(value: string): string {
  return value.replace(/\b\w/g, (c) => c.toUpperCase());
}
