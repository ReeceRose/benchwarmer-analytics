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

  // Special teams
  ppPct?: number; // Power play percentage
  pkPct?: number; // Penalty kill percentage

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

/** Official NHL standings for a team */
export interface OfficialStandings {
  abbreviation: string;
  name: string;
  division?: string;
  conference?: string;

  // Core standings
  gamesPlayed: number;
  wins: number;
  losses: number;
  otLosses: number;
  points: number;
  pointPctg?: number;

  // Goals
  goalsFor: number;
  goalsAgainst: number;
  goalDifferential: number;

  // Splits
  homeRecord: string;
  awayRecord: string;
  last10Record: string;
  streak?: string;

  // Positioning
  divisionRank: number;
  conferenceRank: number;
  leagueRank: number;
  wildcardRank: number;
}

/** Response from GET /api/standings */
export interface OfficialStandingsResponse {
  season?: number;
  teams: OfficialStandings[];
}

/** Team analytics for standings overlay */
export interface StandingsAnalytics {
  abbreviation: string;
  xGoalsFor: number;
  xGoalsAgainst: number;
  xGoalsPct?: number;
  corsiPct?: number;
  fenwickPct?: number;
  pdo?: number;
  shootingPct?: number;
  savePct?: number;
  expectedPoints: number;
  pointsDiff: number;
}

/** Response from GET /api/standings/analytics */
export interface StandingsAnalyticsResponse {
  season: number;
  teams: StandingsAnalytics[];
}

/** Grouping options for standings view */
export type StandingsGrouping = "league" | "conference" | "division";

/** Combined standings with optional analytics */
export interface StandingsWithAnalytics extends OfficialStandings {
  analytics?: StandingsAnalytics;
}

/** Category rankings for a team, showing both raw values and ranks (1-32) */
export interface TeamCategoryRanks {
  abbreviation: string;
  name: string;

  // Raw values (for tooltips)
  goalsFor: number;
  goalsAgainst: number;
  goalDifferential: number;
  xGoalsFor: number;
  xGoalsAgainst: number;
  xGoalsPct?: number;
  corsiPct?: number;
  fenwickPct?: number;
  ppPct?: number;
  pkPct?: number;
  highDangerChancesFor: number;
  highDangerChancesAgainst: number;
  shootingPct?: number;
  savePct?: number;
  faceoffPct?: number;
  penaltiesDrawn: number;
  penaltiesTaken: number;
  penaltyDifferential: number;
  hits: number;
  hitsAgainst: number;
  takeaways: number;
  giveaways: number;
  blockedShots: number;

  // Overall composite rank (weighted average of all ranks)
  overallRank: number;
  overallScore: number;

  // Ranks (1-32)
  goalsForRank: number;
  goalsAgainstRank: number;
  goalDifferentialRank: number;
  xGoalsForRank: number;
  xGoalsAgainstRank: number;
  xGoalsPctRank: number;
  corsiPctRank: number;
  fenwickPctRank: number;
  ppPctRank: number;
  pkPctRank: number;
  highDangerForRank: number;
  highDangerAgainstRank: number;
  shootingPctRank: number;
  savePctRank: number;
  faceoffPctRank: number;
  penaltiesDrawnRank: number;
  penaltiesTakenRank: number;
  penaltyDifferentialRank: number;
  hitsRank: number;
  hitsAgainstRank: number;
  takeawaysRank: number;
  giveawaysRank: number;
  blockedShotsRank: number;
}

/** Response from GET /api/standings/category-rankings */
export interface CategoryRankingsResponse {
  season: number;
  teams: TeamCategoryRanks[];
}
