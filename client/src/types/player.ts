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
