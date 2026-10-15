/**
 * Chart colours, by role. Every colour a chart uses comes from one of these,
 * so a meaning always has one colour and a colour one meaning:
 *
 * - CHART_COLOURS: categorical series (which player, which season), in order.
 *   Blue, orange, aqua, yellow, violet: no red or green, which mean bad/good.
 * - STATUS_COLOURS: good / bad / caution, only when the data means that.
 * - ZONE_COLOURS, UNIT_COLOURS: fixed pairs that recur across pages.
 * - SHOT_DANGER_COLOURS: the shot-map scale (its own tokens, not chart slots).
 * - Team sides in two-team views: `teamColour()` in game-live/live-utils.
 *
 * All resolve to theme CSS variables (index.css), so they follow dark mode.
 */

import { getDangerZoneFromXg } from "@/lib/danger-zones";

/** Categorical series palette. Assign in order; don't cycle past five. */
export const CHART_COLOURS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

/** Good / bad / caution. Only for values that cross a meaningful threshold. */
export const STATUS_COLOURS = {
  good: "var(--success)",
  bad: "var(--error)",
  caution: "var(--warning)",
} as const;

/** Zone starts, zone time and giveaways: O-zone, neutral, D-zone. */
export const ZONE_COLOURS = {
  offensive: CHART_COLOURS[0],
  neutral: "var(--muted-foreground)",
  defensive: CHART_COLOURS[1],
} as const;

/**
 * Pairs that split a team in two: power play vs penalty kill, forwards vs
 * defence. Always the first two series colours, first-named first.
 */
export const UNIT_COLOURS = {
  powerPlay: CHART_COLOURS[0],
  penaltyKill: CHART_COLOURS[1],
  forwards: CHART_COLOURS[0],
  defence: CHART_COLOURS[1],
} as const;

/** A reference or expected series drawn beside an actual one. */
export const REFERENCE_COLOUR = "var(--muted-foreground)";

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

/** Shot-map scale, based on expected goal (xG) probability. */
export const SHOT_DANGER_COLOURS = {
  goal: "var(--shot-goal)",
  highDanger: "var(--shot-high)",
  mediumDanger: "var(--shot-medium)",
  lowDanger: "var(--shot-low)",
} as const;

/**
 * Get chemistry heat colour based on xG percentage: bad (35%) through a
 * neutral tint (50%) to good (65%). Mixed with the card
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
  const hue = clamped >= 50 ? STATUS_COLOURS.good : STATUS_COLOURS.bad;
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
