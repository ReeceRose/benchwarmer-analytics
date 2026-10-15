/** One side (home or away) of a team's season, as rates. */
export interface HomeAwaySide {
  gamesPlayed: number;
  wins: number;
  losses: number;
  otLosses: number;
  /** Points / possible points; null before any game is final. */
  pointsPct: number | null;
  // All situations
  goalsForPerGame: number;
  goalsAgainstPerGame: number;
  shotsForPerGame: number;
  shotsAgainstPerGame: number;
  faceoffPct: number | null;
  // 5-on-5
  xGoalsPct: number | null;
  corsiPct: number | null;
  shootingPct: number | null;
  savePct: number | null;
  // Special teams and discipline
  ppMinutesPerGame: number;
  pkMinutesPerGame: number;
  ppGoalsPer60: number;
  pkGoalsAgainstPer60: number;
  penaltiesDrawn: number;
  penaltiesTaken: number;
  penaltiesDrawnPer60: number;
  penaltiesTakenPer60: number;
  netPenaltiesPer60: number;
}

export interface HomeAwayResponse {
  teamAbbreviation: string;
  season: number;
  playoffs: boolean;
  home: HomeAwaySide;
  away: HomeAwaySide;
  /** Every team's home games together, and every team's away games. */
  league: { home: HomeAwaySide; away: HomeAwaySide };
}

export interface HomeAwaySeason {
  season: number;
  home: HomeAwaySide;
  away: HomeAwaySide;
}

/** Home and away rates by season, oldest first; teamAbbreviation is null for the league. */
export interface HomeAwayHistoryResponse {
  teamAbbreviation: string | null;
  playoffs: boolean;
  seasons: HomeAwaySeason[];
}

/** One team's penalty totals in its home (or road) games for a season. */
export interface VenuePenaltyTotals {
  gamesPlayed: number;
  iceTimeSeconds: number;
  drawn: number;
  taken: number;
  pimDrawn: number;
  pimTaken: number;
  ppSeconds: number;
  pkSeconds: number;
  ppGoals: number;
  pkGoalsAgainst: number;
}

export interface TeamVenuePenalties {
  team: string;
  home: VenuePenaltyTotals;
  away: VenuePenaltyTotals;
}

/** Every team's home and road penalty totals by season, oldest first. */
export interface PenaltiesByVenueResponse {
  playoffs: boolean;
  seasons: { season: number; teams: TeamVenuePenalties[] }[];
}
