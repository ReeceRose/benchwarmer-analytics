import type { PlayerInjury } from "@/types/injuries";

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

/** A goalie on the injury list. */
export interface InjuredGoalie {
  /** Our player ID; null when ESPN's entry didn't match one. */
  playerId: number | null;
  name: string;
  injury: PlayerInjury;
}

/** Who might start in goal for a team with an injured goalie (talent in goals saved above expected per expected goal). */
export interface GoalieOutlook {
  /** The team's usual goaltending: its goalies' talent weighted by this season's starts. */
  usual: number;
  goalies: { playerId: number; talent: number; weight: number; outUntil: string | null }[];
}

/** One team in the sandbox: the parts of its rating, so the browser can re-blend them. */
export interface SandboxTeam {
  team: string;
  conference: string;
  division: string;
  points: number;
  gamesPlayed: number;
  regulationWins: number;
  /** This season's totals: 5v5 xG differential, goal differential and games. */
  season: { xgd: number; gd: number; n: number };
  /** Last season, per game; null for a team that didn't play. */
  prior: { xgd: number; gd: number } | null;
  /** Roster talent as 5v5 xG differential per game, before fading with games played. */
  roster: number;
  /** Goaltending in goals saved above expected per game. */
  goalie: number;
  /** Set when a goalie is listed as out (the injury option). */
  goalieOutlook: GoalieOutlook | null;
}

/** A remaining regular-season game. `rest` is restGap: 1 if only the away team played the day before, -1 if only the home team did. */
export interface SandboxGame {
  gameId: string;
  home: string;
  away: string;
  date: string;
  rest: number;
}

/** The main model's settings, the sandbox's starting point. */
export interface SandboxModel {
  /** Home ice, xG gap, goal gap, roster gap, goaltending gap, rest. */
  coefficients: number[];
  priorGames: number;
  carryOver: number;
  rosterGames: number;
  strengthSd: number;
  overtimeRate: number;
  /** Logit per goal per game the expected starter beats the usual goaltending by (injury option). */
  starterGapCoefficient: number;
}

/** Everything the sandbox simulation needs, saved with each daily run. */
export interface SandboxInputs {
  season: number;
  runDate: string;
  model: SandboxModel;
  teams: SandboxTeam[];
  games: SandboxGame[];
  injuredGoalies: (InjuredGoalie & { team: string })[];
}

/** Response from GET /api/projections/sandbox */
export interface SandboxResponse {
  season: number;
  inputs: SandboxInputs | null;
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
