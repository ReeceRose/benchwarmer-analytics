/** Team data */
export interface Team {
  id: number;
  abbreviation: string;
  name: string;
  division?: string;
  conference?: string;
  isActive: boolean;
}

/** Response from GET /api/teams */
export interface TeamListResponse {
  teams: Team[];
}

/** Stats breakdown for a single score state */
export interface ScoreStateBreakdown {
  state: string;
  shotsFor: number;
  shotsAgainst: number;
  goalsFor: number;
  goalsAgainst: number;
  xGoalsFor: number;
  xGoalsAgainst: number;
  shootingPct: number | null;
  savePct: number | null;
  xgDifferential: number;
  timeSeconds: number | null;
}

/** Response from GET /api/teams/{abbrev}/score-state-stats */
export interface ScoreStateStatsResponse {
  teamAbbreviation: string;
  season: number;
  isPlayoffs: boolean;
  leading: ScoreStateBreakdown;
  trailing: ScoreStateBreakdown;
  tied: ScoreStateBreakdown;
  total: ScoreStateBreakdown;
}

/** One situation of a team's game (goals exclude shootouts) */
export interface TeamGameSplit {
  goalsFor: number;
  goalsAgainst: number;
  xGoalsFor: number;
  xGoalsAgainst: number;
  shotAttemptsFor: number;
  shotAttemptsAgainst: number;
}

/** One game in a team's game log */
export interface TeamGameLogEntry {
  gameId: string;
  gameDate: string;
  opponent: string;
  isHome: boolean;
  /** Final score, shootouts included; null until the game is final */
  teamScore: number | null;
  opponentScore: number | null;
  periodType: string | null;
  result: "W" | "L" | "OTL" | null;
  all: TeamGameSplit;
  fiveOnFive: TeamGameSplit | null;
}

/** Response from GET /api/teams/{abbrev}/games */
export interface TeamGameLogResponse {
  teamAbbreviation: string;
  season: number;
  isPlayoffs: boolean;
  games: TeamGameLogEntry[];
}
