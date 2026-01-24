export type LeaderboardCategory =
  | "points"
  | "goals"
  | "assists"
  | "expectedGoals"
  | "corsiPct"
  | "iceTime"
  | "gamesPlayed"
  | "savePct"
  | "gaa"
  | "gsax"
  | "shotsAgainst";

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
  expectedGoals?: number;
  corsiForPct?: number;
  iceTimeSeconds?: number;
  // Goalie stats
  savePercentage?: number;
  goalsAgainstAverage?: number;
  goalsSavedAboveExpected?: number;
  shotsAgainst?: number;
}

export interface LeaderboardResponse {
  category: LeaderboardCategory;
  season: number;
  situation: string;
  totalCount: number;
  entries: LeaderboardEntry[];
}
