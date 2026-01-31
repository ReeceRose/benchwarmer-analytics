export type LeaderboardCategory =
  // Skater categories
  | "points"
  | "goals"
  | "assists"
  | "shots"
  | "expectedGoals"
  | "xgPer60"
  | "corsiPct"
  | "fenwickPct"
  | "oiShPct"
  | "oiSvPct"
  | "iceTime"
  | "gamesPlayed"
  // Goalie categories
  | "savePct"
  | "gaa"
  | "gsax"
  | "shotsAgainst"
  | "goalieTime"
  | "goalsAgainst"
  | "xga"
  | "reboundControl";

export interface LeaderboardEntry {
  rank: number;
  playerId: number;
  name: string;
  team?: string;
  position?: string;
  primaryValue: number;
  gamesPlayed: number;
  // Skater stats
  goals?: number;
  assists?: number;
  shots?: number;
  expectedGoals?: number;
  expectedGoalsPer60?: number;
  corsiForPct?: number;
  fenwickForPct?: number;
  onIceShootingPct?: number;
  onIceSavePct?: number;
  iceTimeSeconds?: number;
  // Goalie stats
  savePercentage?: number;
  goalsAgainstAverage?: number;
  goalsSavedAboveExpected?: number;
  shotsAgainst?: number;
  goalieIceTimeSeconds?: number;
  goalsAgainst?: number;
  expectedGoalsAgainst?: number;
  highDangerShots?: number;
  highDangerGoals?: number;
  mediumDangerShots?: number;
  mediumDangerGoals?: number;
  lowDangerShots?: number;
  lowDangerGoals?: number;
  rebounds?: number;
  expectedRebounds?: number;
}

export interface LeaderboardResponse {
  category: LeaderboardCategory;
  season: number;
  situation: string;
  totalCount: number;
  entries: LeaderboardEntry[];
}
