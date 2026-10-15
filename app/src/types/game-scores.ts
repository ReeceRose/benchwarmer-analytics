/** One skater's game, ranked by Game Score. */
export interface GameScoreEntry {
  playerId: number;
  name: string;
  position: string;
  team: string;
  opponent: string;
  isHome: boolean;
  gameId: string;
  gameDate: string;
  isPlayoffs: boolean;
  toiSeconds: number;
  goals: number;
  assists: number;
  points: number;
  shotsOnGoal: number;
  gameScore: number;
  gameScoreScoring: number;
  gameScoreOnIce: number;
  gameScoreOther: number;
  /** Final score from the player's team's point of view; null if unknown. */
  teamScore: number | null;
  opponentScore: number | null;
  periodType: string | null;
  headshotUrl: string | null;
}

/** Response from GET /api/stats/game-scores/nightly */
export interface NightlyGameScoresResponse {
  date: string | null;
  /** Final games that night with Game Scores, and all final games. */
  gamesWithScores: number;
  gamesFinal: number;
  best: GameScoreEntry[];
  worst: GameScoreEntry[];
}

/** Response from GET /api/stats/game-scores/single-games */
export interface SingleGameRecordsResponse {
  season: number;
  playoffs: boolean;
  gamesWithScores: number;
  gamesFinal: number;
  best: GameScoreEntry[];
  worst: GameScoreEntry[];
}
