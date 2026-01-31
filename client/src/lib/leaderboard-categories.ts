import type { LeaderboardCategory } from "@/types";

/**
 * Centralized definitions for leaderboard categories.
 * Used across LeaderStrip, leaderboards page, and other components.
 */

export const GOALIE_CATEGORIES: LeaderboardCategory[] = [
  "savePct",
  "gaa",
  "gsax",
  "shotsAgainst",
  "goalieTime",
  "goalsAgainst",
  "xga",
  "reboundControl",
];

export const SKATER_CATEGORIES: LeaderboardCategory[] = [
  "points",
  "goals",
  "assists",
  "shots",
  "expectedGoals",
  "xgPer60",
  "corsiPct",
  "fenwickPct",
  "oiShPct",
  "oiSvPct",
  "iceTime",
  "gamesPlayed",
];

export const ALL_CATEGORIES: LeaderboardCategory[] = [
  ...SKATER_CATEGORIES,
  ...GOALIE_CATEGORIES,
];

/**
 * Categories where lower values are better (affects sort direction display).
 */
export const LOWER_IS_BETTER_CATEGORIES: LeaderboardCategory[] = ["gaa", "goalsAgainst", "xga", "reboundControl"];

export function isGoalieCategory(category: LeaderboardCategory): boolean {
  return GOALIE_CATEGORIES.includes(category);
}

export function isLowerBetterCategory(category: LeaderboardCategory): boolean {
  return LOWER_IS_BETTER_CATEGORIES.includes(category);
}

export function getDefaultSortDir(category: LeaderboardCategory): "asc" | "desc" {
  return isLowerBetterCategory(category) ? "asc" : "desc";
}
