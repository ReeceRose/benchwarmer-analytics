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
