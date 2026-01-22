/** Team power ranking data */
export interface TeamPowerRanking {
  abbreviation: string;
  name: string;
  division?: string;
  conference?: string;

  // Standings
  gamesPlayed: number;
  wins: number;
  losses: number;
  otLosses: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;

  // Analytics
  xGoalsFor: number;
  xGoalsAgainst: number;
  xGoalsPct?: number;
  corsiPct?: number;
  fenwickPct?: number;

  // PDO (Sh% + Sv%) - values near 100 are sustainable
  pdo?: number;
  shootingPct?: number;
  savePct?: number;

  // Expected vs Actual
  expectedPoints: number;
  pointsDiff: number; // Points - ExpectedPoints (positive = overperforming)

  // Ranks
  pointsRank: number;
  xGoalsPctRank: number;
}

/** Regression candidate */
export interface RegressionCandidate {
  abbreviation: string;
  name: string;
  pointsRank: number;
  xGoalsPctRank: number;
  pdo?: number;
  reason: string;
}

/** Regression insights */
export interface RegressionInsights {
  likelyToImprove: RegressionCandidate[];
  likelyToRegress: RegressionCandidate[];
}

/** Response from GET /api/standings/power-rankings */
export interface PowerRankingsResponse {
  season: number;
  teams: TeamPowerRanking[];
  insights: RegressionInsights;
}
