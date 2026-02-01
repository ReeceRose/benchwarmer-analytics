/** Basic player info used in lists and search results */
export interface Player {
  id: number;
  name: string;
  position?: string;
  currentTeamAbbreviation?: string;
}

/** Detailed player info including bio data */
export interface PlayerDetail {
  id: number;
  name: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  currentTeamAbbreviation?: string;
  headshotUrl?: string;
  birthDate?: string;
  heightInches?: number;
  weightLbs?: number;
  shoots?: string;
}

/** Player with optional stats for roster display */
export interface RosterPlayer extends PlayerDetail {
  gamesPlayed?: number;
  iceTimeSeconds?: number;
  // Skater stats
  goals?: number;
  assists?: number;
  points?: number;
  shots?: number;
  expectedGoals?: number;
  corsiForPct?: number;
  // Goalie stats
  goalsAgainst?: number;
  shotsAgainst?: number;
  savePercentage?: number;
  goalsAgainstAverage?: number;
  goalsSavedAboveExpected?: number;
}

/** Player statistics for a season/situation */
export interface SkaterStats {
  id: number;
  playerId: number;
  season: number;
  team: string;
  situation: string;
  isPlayoffs: boolean;
  gamesPlayed: number;
  iceTimeSeconds: number;
  goals: number;
  assists: number;
  points: number;
  shots: number;
  expectedGoals?: number;
  expectedGoalsPer60?: number;
  onIceShootingPct?: number;
  onIceSavePct?: number;
  corsiForPct?: number;
  fenwickForPct?: number;
  // Shift quality fields
  shifts?: number;
  oZoneShiftStarts?: number;
  dZoneShiftStarts?: number;
  nZoneShiftStarts?: number;
  oZoneShiftPct?: number;
  dZoneShiftPct?: number;
  // Faceoff fields
  faceoffsWon?: number;
  faceoffsLost?: number;
  faceoffPct?: number;
  // Giveaway/Takeaway fields
  takeaways?: number;
  giveaways?: number;
  dZoneGiveaways?: number;
  giveawayDZonePct?: number;
}

/** Goalie statistics for a season/situation */
export interface GoalieStats {
  id: number;
  playerId: number;
  season: number;
  team: string;
  situation: string;
  isPlayoffs: boolean;
  gamesPlayed: number;
  iceTimeSeconds: number;
  goalsAgainst: number;
  shotsAgainst: number;
  savePercentage?: number;
  goalsAgainstAverage?: number;
  goalsSavedAboveExpected?: number;
  expectedGoalsAgainst?: number;
  lowDangerShots: number;
  mediumDangerShots: number;
  highDangerShots: number;
  lowDangerGoals: number;
  mediumDangerGoals: number;
  highDangerGoals: number;
  // Rebound control fields
  expectedRebounds?: number;
  rebounds: number;
}

/** Response from GET /api/players (search) */
export interface PlayerSearchResponse {
  players: Player[];
  totalCount: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
}

/** Response from GET /api/players/:id/stats (skaters) */
export interface PlayerStatsResponse {
  playerId: number;
  playerName: string;
  stats: SkaterStats[];
}

/** Response from GET /api/players/:id/stats (goalies) */
export interface GoalieStatsResponse {
  playerId: number;
  playerName: string;
  stats: GoalieStats[];
}

/** League baselines for skater metrics (faceoffs) */
export interface SkaterLeagueBaselinesResponse {
  seasons: number[];
  situation: string;
  isPlayoffs: boolean;
  faceoffPct: number | null;
  totalFaceoffsWon: number;
  totalFaceoffsLost: number;
}

/** League baselines for goalie split metrics (danger zones + rebounds) */
export interface GoalieLeagueBaselinesResponse {
  seasons: number[];
  situation: string;
  isPlayoffs: boolean;
  lowDangerSavePct: number | null;
  mediumDangerSavePct: number | null;
  highDangerSavePct: number | null;
  reboundRatio: number | null;
  lowDangerShots: number;
  mediumDangerShots: number;
  highDangerShots: number;
  expectedRebounds: number;
  rebounds: number;
}

/** Linemate data for a player */
export interface Linemate {
  playerId: number;
  playerName: string;
  totalIceTimeSeconds: number;
  gamesPlayed: number;
  goalsFor: number;
  goalsAgainst: number;
  expectedGoalsPct?: number;
}

/** Response from GET /api/players/:id/linemates */
export interface LinemateHistoryResponse {
  playerId: number;
  playerName: string;
  linemates: Linemate[];
}

/** Player data for comparison */
export interface PlayerComparison {
  playerId: number;
  name: string;
  position?: string;
  team?: string;
  stats?: SkaterStats;
  goalieStats?: GoalieStats;
}

/** Response from GET /api/players/compare */
export interface PlayerComparisonResponse {
  season?: number;
  situation: string;
  players: PlayerComparison[];
}

/** Response from GET /api/teams/:abbrev/roster */
export interface RosterResponse {
  teamAbbreviation: string;
  players: RosterPlayer[];
  season?: number;
  playoffs?: boolean;
}

/** Per-game stats for rolling performance */
export interface GameStats {
  gameId: string;
  goals: number;
  shots: number;
  expectedGoals: number;
  shootingPct: number;
}

/** Response from GET /api/players/:id/rolling-stats */
export interface PlayerRollingStatsResponse {
  playerId: number;
  playerName: string;
  season: number;
  gamesIncluded: number;
  games: GameStats[];
  seasonGoalsPerGame: number;
  seasonShotsPerGame: number;
  seasonXgPerGame: number;
  seasonShootingPct: number;
  rollingGoalsPerGame: number;
  rollingShotsPerGame: number;
  rollingXgPerGame: number;
  rollingShootingPct: number;
  trend: "hot" | "cold" | "neutral";
}

/** Per-game stats for goalie workload */
export interface GoalieGameStats {
  gameId: string;
  gameDate: string;
  opponent: string;
  isHome: boolean;
  shotsAgainst: number;
  goalsAgainst: number;
  savePercentage: number;
  expectedGoalsAgainst: number;
  goalsSavedAboveExpected: number;
  isBackToBack: boolean;
  daysSincePreviousGame?: number;
}

/** Workload stats for a time window */
export interface WorkloadWindow {
  days: number;
  gamesPlayed: number;
  gamesPerWeek: number;
  totalShotsAgainst: number;
  avgShotsAgainstPerGame: number;
  avgSavePercentage: number;
  totalGSAx: number;
  isHighWorkload: boolean;
}

/** Back-to-back performance comparison */
export interface BackToBackSplits {
  backToBackGames: number;
  nonBackToBackGames: number;
  backToBackSavePercentage: number;
  nonBackToBackSavePercentage: number;
  backToBackGAA: number;
  nonBackToBackGAA: number;
  backToBackGSAx: number;
  nonBackToBackGSAx: number;
}

/** Response from GET /api/players/:id/workload */
export interface GoalieWorkloadResponse {
  playerId: number;
  playerName: string;
  season: number;
  gamesIncluded: number;
  games: GoalieGameStats[];
  last7Days: WorkloadWindow;
  last14Days: WorkloadWindow;
  last30Days: WorkloadWindow;
  backToBackSplits: BackToBackSplits;
  workloadTrend: "heavy" | "moderate" | "light";
}
