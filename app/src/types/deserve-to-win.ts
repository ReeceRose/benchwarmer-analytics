export interface DeserveToWinResponse {
  gameId: string;
  homeTeamCode: string;
  awayTeamCode: string;
  homeGoals: number;
  awayGoals: number;
  homeSummary: DeserveToWinSummary;
  awaySummary: DeserveToWinSummary;
  progression: DeserveToWinPoint[];
}

export interface DeserveToWinSummary {
  totalXG: number;
  poissonWinPct: number;
  monteCarloWinPct: number;
  monteCarloOTWinPct: number;
  shotsExcludingEmptyNet: number;
}

export interface DeserveToWinPoint {
  shotNumber: number;
  gameTimeSeconds: number;
  period: number;
  isHomeShot: boolean;
  shotXG: number;
  homeXGCumulative: number;
  awayXGCumulative: number;
  homePoissonWinPct: number;
  homeMonteCarloWinPct: number;
  wasGoal: boolean | null;
  isRebound: boolean;
}
