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
  // Live game fields
  currentPeriod?: number | null;
  timeRemaining?: string | null;
  inIntermission?: boolean | null;
  goals?: GameGoal[] | null;
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
  // Live game fields
  record?: string | null;
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

export interface GameGoal {
  period: number;
  timeInPeriod: string;
  scorerName: string;
  scorerId: number;
  teamCode: string;
  strength: string | null;
  assists: string[];
  isGameWinningGoal?: boolean;
}

export interface GameBoxscoreResponse {
  gameId: string;
  homeTeamCode: string;
  awayTeamCode: string;
  homeSkaters: BoxscoreSkater[];
  awaySkaters: BoxscoreSkater[];
  homeGoalies: BoxscoreGoalie[];
  awayGoalies: BoxscoreGoalie[];
}

export interface BoxscoreSkater {
  playerId: number;
  jerseyNumber: number;
  name: string;
  position: string;
  goals: number;
  assists: number;
  points: number;
  plusMinus: number;
  penaltyMinutes: number;
  hits: number;
  shotsOnGoal: number;
  blockedShots: number;
  giveaways: number;
  takeaways: number;
  timeOnIce: string;
  shifts: number;
  faceoffPct: number;
}

export interface BoxscoreGoalie {
  playerId: number;
  jerseyNumber: number;
  name: string;
  shotsAgainst: number;
  saves: number;
  goalsAgainst: number;
  savePct: number | null;
  timeOnIce: string;
  starter: boolean;
  decision: string | null;
}
