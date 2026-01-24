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
  // Head-to-head context
  seasonSeries?: string | null;
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
  // Standings context fields
  streak?: string | null;
  homeRecord?: string | null;
  roadRecord?: string | null;
  last10?: string | null;
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

// Game Preview types
export interface GamePreview {
  game: GamePreviewGame;
  headToHead: HeadToHead;
  teamComparison: TeamComparison;
  hotPlayers: HotPlayers;
  goalieMatchup: GoalieMatchup;
}

export interface GamePreviewGame {
  id: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  startTimeUtc: string | null;
}

export interface HeadToHead {
  season: SeasonRecord;
  lastFive: PastGame[];
}

export interface SeasonRecord {
  homeWins: number;
  awayWins: number;
  overtimeLosses: number;
}

export interface PastGame {
  date: string;
  score: string;
  winner: string;
  overtimeType: string | null;
}

export interface TeamComparison {
  home: TeamPreviewStats;
  away: TeamPreviewStats;
}

export interface TeamPreviewStats {
  teamCode: string;
  gamesPlayed: number;
  xGoalsFor: number;
  xGoalsAgainst: number;
  xGoalsPct: number | null;
  corsiPct: number | null;
  powerPlayPct: number | null;
  penaltyKillPct: number | null;
  // Team record fields from NHL standings
  streak: string | null;
  homeRecord: string | null;
  roadRecord: string | null;
  last10: string | null;
}

export interface HotPlayers {
  home: HotPlayer[];
  away: HotPlayer[];
}

export interface HotPlayer {
  playerId: number;
  name: string;
  position: string | null;
  goals: number;
  assists: number;
  expectedGoals: number;
  differential: number;
  trend: "hot" | "cold";
}

export interface GoalieMatchup {
  home: GoaliePreview[];
  away: GoaliePreview[];
}

export interface GoaliePreview {
  playerId: number;
  name: string;
  gamesPlayed: number;
  savePct: number | null;
  goalsAgainstAvg: number | null;
  goalsSavedAboveExpected: number | null;
}

// Separate type for goalie recent form (fetched on-demand)
export interface GoalieRecentForm {
  playerId: number;
  name: string;
  gamesPlayed: number;
  savePct: number | null;
  shotsAgainst: number;
  goalsAgainst: number;
}

export interface GoalieRecentFormResponse {
  home: GoalieRecentForm[];
  away: GoalieRecentForm[];
}
