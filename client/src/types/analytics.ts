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

export interface Rookie {
  playerId: number;
  name: string;
  team: string;
  position: string | null;
  headshotUrl: string | null;
  age: number;
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
  shots: number;
  expectedGoals: number;
  goalsDifferential: number;
  corsiForPct: number | null;
  fenwickForPct: number | null;
  shotsPer60: number;
  iceTimeSeconds: number;
  rookieScore: number;
}

export interface RookiesResponse {
  season: number;
  minGamesPlayed: number;
  positionFilter: string | null;
  rookies: Rookie[];
}

export type RookiePositionFilter = "all" | "forwards" | "defensemen";

export interface SeasonTrend {
  season: number;
  totalPlayers: number;
  totalGamesPlayed: number;
  totalGoals: number;
  totalAssists: number;
  totalShots: number;
  totalExpectedGoals: number;
  avgCorsiPct: number;
  avgGoalsPerGame: number;
  avgAssistsPerGame: number;
  avgToiPerGame: number;
  avgXgPer60: number;
}

export interface LeagueTrendsResponse {
  situation: string;
  seasons: SeasonTrend[];
}
