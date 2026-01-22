export interface BreakoutCandidate {
  playerId: number;
  name: string;
  team: string;
  position: string | null;
  gamesPlayed: number;
  goals: number;
  assists: number;
  shots: number;
  expectedGoals: number;
  goalsDifferential: number; // Positive = shooting below expected (unlucky)
  corsiForPct: number | null;
  fenwickForPct: number | null;
  shotsPer60: number;
  breakoutScore: number;
}

export interface BreakoutCandidatesResponse {
  season: number;
  minGamesPlayed: number;
  candidates: BreakoutCandidate[];
}

export interface AgeDataPoint {
  age: number;
  season: number | null;
  pointsPer60: number;
  goalsPer60: number;
  xgPer60: number;
  sampleSize: number;
}

export interface PlayerAgeCurve {
  playerId: number;
  playerName: string;
  dataPoints: AgeDataPoint[];
}

export interface AgeCurvesResponse {
  minGamesPlayed: number;
  useMedian: boolean;
  leagueCurve: AgeDataPoint[];
  playerCurves: PlayerAgeCurve[];
}

export interface DistributionDataPoint {
  pointsPer60: number;
  goalsPer60: number;
  xgPer60: number;
  gamesPlayed: number;
}

export interface AgeDistributionResponse {
  age: number;
  minGamesPlayed: number;
  dataPoints: DistributionDataPoint[];
}

export interface SeasonPercentilesResponse {
  season: number;
  minGames: number;
  playerCount: number;
  pointsPerGame: number[];
  goalsPerGame: number[];
  pointsPer60: number[];
  goalsPer60: number[];
}
