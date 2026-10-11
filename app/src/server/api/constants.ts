// Ports of Benchwarmer.Data/{GameState,NhlConstants,LeaderboardCategories}.cs
// and Constants/MoneyPuckDangerZones.cs.

export const GameState = {
  future: "FUT",
  preGame: "PRE",
  live: "LIVE",
  critical: "CRIT",
  final: "OFF",
  finalAlt: "FINAL",

  preseason: 1,
  regularSeason: 2,
  playoffs: 3,
  allStar: 4,
} as const;

export function isFinalState(state: string | null | undefined): boolean {
  return state === GameState.final || state === GameState.finalAlt;
}

export function isLiveState(state: string | null | undefined): boolean {
  return state === GameState.live || state === GameState.critical;
}

export function isScheduledState(state: string | null | undefined): boolean {
  return state === GameState.future || state === GameState.preGame;
}

// Final, or a past game with a score (the stored state can be stale).
export function isGameCompleted(state: string | null, gameDate: string, homeScore: number, awayScore: number): boolean {
  if (isFinalState(state)) return true;
  const today = new Date().toISOString().slice(0, 10);
  return gameDate < today && (homeScore > 0 || awayScore > 0);
}

export const NhlConstants = {
  // A player loses rookie status after this many games in any prior season.
  rookieMaxPriorGames: 26,
  // ...or by being this old on September 15 of the season.
  rookieMaxAge: 26,
  ageCalculationMonth: 9,
  ageCalculationDay: 15,
} as const;

export const LeaderboardCategories = {
  skater: [
    "points", "goals", "assists", "shots", "expectedgoals", "xgper60", "corsipct", "fenwickpct",
    "oishpct", "oisvpct", "icetime", "gamesplayed", "faceoffpct",
  ],
  goalie: ["savepct", "gaa", "gsax", "shotsagainst", "goalietime", "goalsagainst", "xga", "reboundcontrol"],
} as const;

export function isLeaderboardCategory(category: string): boolean {
  const c = category.toLowerCase();
  return (LeaderboardCategories.skater as readonly string[]).includes(c) || isGoalieCategory(c);
}

export function isGoalieCategory(category: string): boolean {
  return (LeaderboardCategories.goalie as readonly string[]).includes(category.toLowerCase());
}

// MoneyPuck danger zones by shot xG: low < 0.08 <= medium < 0.20 <= high.
export const DangerZones = {
  mediumThreshold: 0.08,
  highThreshold: 0.2,
} as const;

export const VALID_SITUATIONS: readonly string[] = ["all", "5on5", "5on4", "4on5", "5on3", "3on5", "4on4", "3on3", "other"];
