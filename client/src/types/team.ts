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
