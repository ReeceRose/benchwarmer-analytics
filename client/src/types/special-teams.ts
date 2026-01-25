export interface SpecialTeamsOverview {
  teamAbbreviation: string;
  season: number;
  powerPlay: PowerPlaySummary;
  penaltyKill: PenaltyKillSummary;
}

export interface PowerPlaySummary {
  opportunities: number;
  goals: number;
  percentage: number;
  xGoals: number;
  xGoalsPer60: number;
  shotsFor: number;
  shootingPct: number;
  highDangerChances: number;
  highDangerGoals: number;
  leagueRank: number | null;
  iceTimeSeconds: number;
}

export interface PenaltyKillSummary {
  timesShorthanded: number;
  goalsAgainst: number;
  percentage: number;
  xGoalsAgainst: number;
  xGoalsAgainstPer60: number;
  shotsAgainst: number;
  savePct: number;
  highDangerAgainst: number;
  highDangerGoalsAgainst: number;
  leagueRank: number | null;
  iceTimeSeconds: number;
}

export interface SpecialTeamsPlayer {
  playerId: number;
  name: string;
  position: string | null;
  iceTimeSeconds: number;
  goals: number;
  assists: number;
  points: number;
  shots: number;
  xGoals: number | null;
  xGoalsPer60: number | null;
  pointsPer60: number | null;
  gamesPlayed: number;
}

export interface SpecialTeamsPlayersResponse {
  teamAbbreviation: string;
  season: number;
  situation: string;
  players: SpecialTeamsPlayer[];
}

export type SpecialTeamsSituation = "5on4" | "4on5";

// League-wide special teams stats types

export interface TeamSpecialTeamsRanking {
  teamAbbreviation: string;
  teamName: string;
  // Power Play
  ppPct: number;
  ppRank: number;
  ppGoals: number;
  ppOpportunities: number;
  ppXgPer60: number;
  ppShPct: number;
  // Penalty Kill
  pkPct: number;
  pkRank: number;
  pkGoalsAgainst: number;
  pkTimesShort: number;
  pkXgaPer60: number;
  pkSvPct: number;
  // Combined
  specialTeamsPct: number;
  overallRank: number;
}

export interface TeamSpecialTeamsRankingsResponse {
  season: number;
  teams: TeamSpecialTeamsRanking[];
}

export interface PlayerPenaltyStats {
  playerId: number;
  name: string;
  team: string;
  position: string | null;
  gamesPlayed: number;
  iceTimeMinutes: number;
  // Penalties
  penaltiesDrawn: number;
  penaltiesTaken: number;
  netPenalties: number;
  penaltiesDrawnPer60: number;
  penaltiesTakenPer60: number;
  netPenaltiesPer60: number;
  pimDrawn: number;
  pimTaken: number;
}

export interface PlayerPenaltyStatsResponse {
  season: number;
  players: PlayerPenaltyStats[];
}

export interface SpecialTeamsPlayerLeader {
  playerId: number;
  name: string;
  team: string;
  position: string | null;
  gamesPlayed: number;
  iceTimeMinutes: number;
  goals: number;
  assists: number;
  points: number;
  pointsPer60: number;
  xgPer60: number;
  goalsDiff: number;
}

export interface SpecialTeamsPlayerLeadersResponse {
  season: number;
  situation: string;
  players: SpecialTeamsPlayerLeader[];
}

// Filter types for special teams page
export interface SpecialTeamsFilters {
  season?: number;
  minToi?: number;
  position?: "F" | "D";
  team?: string;
}

export type PlayerLeaderSortField =
  | "toi"
  | "goals"
  | "assists"
  | "points"
  | "pointsPer60"
  | "xgPer60";

export type PenaltySortField =
  | "penaltiesDrawn"
  | "penaltiesTaken"
  | "netPenalties"
  | "drawnPer60"
  | "takenPer60"
  | "netPer60";
