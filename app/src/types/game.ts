import type { AllTimeRecord } from "@/types/history";
import type { InjuredPlayer, PlayerInjury } from "@/types/injuries";

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
  overallRecord?: string | null;
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
  /** NHL.com highlight video, once the NHL posts one. */
  highlightUrl?: string | null;
}

export interface GameBoxscoreResponse {
  gameId: string;
  homeTeamCode: string;
  awayTeamCode: string;
  /** NHL game state (e.g. "LIVE", "OFF"), so clients know whether to poll. */
  gameState: string | null;
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
  /** Each team's injured players, most serious first; empty for past games. */
  injuries: { home: InjuredPlayer[]; away: InjuredPlayer[] };
}

export interface GamePreviewGame {
  id: string;
  date: string;
  homeTeam: string;
  homeTeamName: string | null;
  awayTeam: string;
  awayTeamName: string | null;
  startTimeUtc: string | null;
}

export interface HeadToHead {
  /** This season's regular-season series, from the home team's side (for the header). */
  season: SeasonRecord;
  /** Meetings over recent spans, from the preview's sides; the current season counts as one. */
  spans: { season: HeadToHeadSpan; lastSeason: HeadToHeadSpan; fiveSeasons: HeadToHeadSpan };
  /** Franchise records against each other, from the away team's side (NHL records). */
  allTime: { regular: AllTimeRecord | null; playoffs: AllTimeRecord | null };
}

export interface SeasonRecord {
  homeWins: number;
  awayWins: number;
  overtimeLosses: number;
}

export interface HeadToHeadSpan {
  regular: MeetingRecord | null;
  playoffs: MeetingRecord | null;
  /** Regular-season and playoff meetings, newest first. */
  games: PastGame[];
}

/** Results over a span; away and home are the preview's sides, wherever each game was played. */
export interface MeetingRecord {
  gamesPlayed: number;
  awayWins: number;
  homeWins: number;
  /** Games decided in overtime or a shootout (already counted as wins above). */
  overtime: number;
  awayGoals: number;
  homeGoals: number;
}

export interface PastGame {
  gameId: string;
  date: string;
  isPlayoffs: boolean;
  /** Played at the preview's home team's rink. */
  atHome: boolean;
  /** The preview's home and away teams' goals. */
  homeScore: number;
  awayScore: number;
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
  overallRecord: string | null;
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
  injury: PlayerInjury | null;
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
  injury: PlayerInjury | null;
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

// Game Shots types
export interface GameShotsResponse {
  gameId: string;
  homeTeamCode: string;
  awayTeamCode: string;
  homeShots: GameShot[];
  awayShots: GameShot[];
}

export interface GameShot {
  period: number;
  gameSeconds: number;
  shooterName: string | null;
  shooterPlayerId: number | null;
  shooterPosition: string | null;
  xCoord: number;
  yCoord: number;
  xGoal: number;
  isGoal: boolean;
  shotWasOnGoal: boolean;
  shotType: string | null;
  shotDistance: number;
  shotAngle: number;
  // Additional context
  shotRebound: boolean;
  shotRush: boolean;
  homeSkatersOnIce: number;
  awaySkatersOnIce: number;
  goalieName: string | null;
}
