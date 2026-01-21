export interface GamesResponse {
  date: string;
  games: GameSummary[];
}

export interface GameSummary {
  gameId: string;
  gameDate: string;
  gameState: string | null;
  startTimeUtc: string | null;
  home: GameTeam;
  away: GameTeam;
  periodType: string | null;
  periods: PeriodStats[];
  hasShotData: boolean;
}

export interface GameTeam {
  teamCode: string;
  teamName: string | null;
  goals: number | null;
  shots: number | null;
  shotsOnGoal: number | null;
  expectedGoals: number | null;
  goalsVsXgDiff: number | null;
  highDangerChances: number | null;
  mediumDangerChances: number | null;
  lowDangerChances: number | null;
  avgShotDistance: number | null;
}

export interface PeriodStats {
  period: number;
  homeShots: number;
  awayShots: number;
  homeGoals: number;
  awayGoals: number;
  homeXG: number;
  awayXG: number;
}
