export interface TeamPlayoffOdds {
  team: string;
  conference: string;
  division: string;
  gamesPlayed: number;
  points: number;
  pointsAvg: number;
  /** 10th and 90th percentile of simulated final points. */
  pointsP10: number;
  pointsP90: number;
  /** Probabilities (0-1). */
  makePlayoffs: number;
  winRound1: number;
  winRound2: number;
  winConference: number;
  winCup: number;
  /** Change in playoff odds since the previous run (0-1 scale); null on the first run. */
  makePlayoffsChange: number | null;
}

export interface GamePlayoffStakes {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeWinProbability: number;
  homeIfWin: number;
  homeIfLoss: number;
  awayIfWin: number;
  awayIfLoss: number;
}

/** Response from GET /api/projections/playoff-odds */
export interface PlayoffOddsResponse {
  season: number;
  runDate: string | null;
  previousRunDate: string | null;
  simulations: number;
  teams: TeamPlayoffOdds[];
  games: GamePlayoffStakes[];
}

/** Response from GET /api/projections/games */
export interface GameProjectionsResponse {
  date: string;
  runDate: string | null;
  games: { gameId: string; homeWinProbability: number }[];
}
