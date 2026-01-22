/** Individual shot data for visualization */
export interface Shot {
  shotId: string;
  shooterPlayerId?: number;
  shooterName?: string;
  shooterPosition?: string;
  period: number;
  gameTimeSeconds: number;
  arenaAdjustedXCoord?: number;
  arenaAdjustedYCoord?: number;
  shotDistance?: number;
  shotAngle?: number;
  shotType?: string;
  isGoal: boolean;
  shotWasOnGoal: boolean;
  shotOnEmptyNet: boolean;
  shotRebound: boolean;
  shotRush: boolean;
  xGoal?: number;
  homeSkatersOnIce: number;
  awaySkatersOnIce: number;
  gameId: string;
}

/** Shot summary statistics */
export interface ShotSummary {
  totalShots: number;
  goals: number;
  shotsOnGoal: number;
  shootingPct: number;
  totalXGoal: number;
  goalsAboveExpected: number;
  highDangerShots: number;
  mediumDangerShots: number;
  lowDangerShots: number;
}

/** Response from GET /api/teams/:abbrev/shots */
export interface TeamShotsResponse {
  teamAbbrev: string;
  season: number;
  isPlayoffs?: boolean;
  shots: Shot[];
  summary: ShotSummary;
}

/** Response from GET /api/players/:id/shots */
export interface PlayerShotsResponse {
  playerId: number;
  playerName: string;
  season?: number;
  shots: Shot[];
  summary: ShotSummary;
}

/** Danger level filter options */
export type DangerLevel = "all" | "high" | "medium-high" | "low";

/** Score state filter options (leading, trailing, tied from team's perspective) */
export type ScoreState = "all" | "leading" | "trailing" | "tied";

/** Query parameters for shots endpoint */
export interface ShotQueryParams {
  season: number;
  playoffs?: boolean;
  period?: number;
  shotType?: string;
  playerId?: number;
  goalsOnly?: boolean;
  scoreState?: ScoreState;
  limit?: number;
  dangerLevel?: DangerLevel;
}

/** Per-shooter statistics */
export interface ShooterStats {
  playerId: number;
  playerName: string;
  position?: string;
  shots: number;
  goals: number;
  shootingPct: number;
  totalXGoal: number;
  goalsAboveExpected: number;
}

/** Valid shot types */
export type ShotType =
  | "WRIST"
  | "SLAP"
  | "SNAP"
  | "BACKHAND"
  | "TIP"
  | "WRAP"
  | "DEFLECTED";
