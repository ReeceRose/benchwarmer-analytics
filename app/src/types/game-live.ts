import type { PlayerInjury } from "@/types/injuries";

// Response shape for /api/games/{gameId}/live: the game centre model built
// from the NHL API's live feeds (gamecenter landing, boxscore, play-by-play,
// right-rail and shift charts). Attempt, xG and on-ice numbers are derived
// from play-by-play, so they exist while a game is in progress (MoneyPuck data
// only arrives after the game).

export type TeamSide = "away" | "home";
/** Strength from the acting team's point of view. EN = shooting at an empty net. */
export type StrengthState = "EV" | "PP" | "SH" | "EN";
export type ShotResult = "GOAL" | "SOG" | "MISS" | "BLOCK";
export type PuckEventType = "hit" | "giveaway" | "takeaway" | "faceoff" | "penalty";

export interface LiveGameMeta {
  gameId: string;
  gameState: string;
  period: number;
  periodType: string | null;
  timeRemaining: string | null;
  clockRunning: boolean;
  inIntermission: boolean;
  /** Game seconds of the latest play-by-play event (period 1 starts at 0). */
  elapsedSeconds: number;
  venue: string | null;
  venueCity: string | null;
  startTimeUtc: string | null;
  broadcasts: string[];
  eventCount: number;
  shiftCount: number;
  /** When the server built this response (ISO). */
  updatedAt: string;
  /** "moneypuck" once MoneyPuck shot data exists for the game; "model" is the live approximation. */
  xgSource: "moneypuck" | "model";
}

export interface LiveSituation {
  awaySkaters: number;
  homeSkaters: number;
  /** Team on the power play, if any. */
  powerPlayTeam: TeamSide | null;
  /** Power-play time left, "MM:SS". */
  timeRemaining: string | null;
  descriptions: string[];
}

export interface LiveTeamInfo {
  abbrev: string;
  name: string;
  score: number;
  shotsOnGoal: number;
  headCoach: string | null;
  scratches: LiveScratch[];
}

/** A player scratched from the lineup, with their injury when they're on the injury list. */
export interface LiveScratch {
  playerId: number | null;
  name: string;
  injury: PlayerInjury | null;
}

/** Counters for one team over some slice of the game (all, a period or a strength). */
export interface LiveTeamCounts {
  goals: number;
  xg: number;
  /** Shot attempts (Corsi). */
  attempts: number;
  /** Unblocked attempts (Fenwick). */
  unblocked: number;
  shotsOnGoal: number;
  highDanger: number;
  missed: number;
  /** This team's attempts that the opponent blocked. */
  blockedByOpponent: number;
  /** Opponent attempts this team blocked. */
  blocks: number;
  hits: number;
  giveaways: number;
  takeaways: number;
  faceoffWins: number;
  penaltyMinutes: number;
}

export interface LiveTeamStats {
  all: LiveTeamCounts;
  byPeriod: Record<string, LiveTeamCounts>;
  byStrength: Partial<Record<StrengthState, LiveTeamCounts>>;
  /** Seconds played at each strength, from this team's point of view. */
  timeByStrength: Partial<Record<StrengthState, number>>;
  /** Faceoffs by zone from this team's point of view (O = its offensive zone). */
  faceoffsByZone: Record<"O" | "N" | "D", { won: number; lost: number }>;
  shotTypes: Record<string, number>;
  missReasons: Record<string, number>;
}

export interface LiveShot {
  /** Game seconds. */
  t: number;
  period: number;
  timeInPeriod: string;
  team: TeamSide;
  result: ShotResult;
  /** Coordinates normalized so the shooting team attacks the net at x = +89. */
  x: number | null;
  y: number | null;
  distance: number | null;
  angle: number | null;
  shotType: string | null;
  missReason: string | null;
  shooterId: number | null;
  shooter: string;
  goalieId: number | null;
  goalie: string | null;
  blocker: string | null;
  /** e.g. "5v4", "6v5 EN" from the shooting team's point of view. */
  strength: string;
  state: StrengthState;
  /** Expected goals; null for blocked attempts. */
  xg: number | null;
  highDanger: boolean;
  rebound: boolean;
  onIceFor: number[];
  onIceAgainst: number[];
  highlightUrl: string | null;
}

export interface LivePuckEvent {
  t: number;
  period: number;
  timeInPeriod: string;
  type: PuckEventType;
  team: TeamSide;
  /** Normalized like shots: the acting team attacks toward x = +89. */
  x: number | null;
  y: number | null;
  /** Zone from the acting team's point of view. */
  zone: "O" | "N" | "D" | null;
  player: string;
  playerId: number | null;
  /** Player hit, faceoff loser or penalty drawer. */
  opponent: string | null;
  opponentId: number | null;
}

/** A stretch of non-5v5 play, in game seconds, labelled from the home team's point of view. */
export interface StrengthSegment {
  start: number;
  end: number;
  homeSkaters: number;
  awaySkaters: number;
  /** Team with the man advantage, or null (e.g. 4v4, empty net at even strength). */
  advantage: TeamSide | null;
  emptyNet: boolean;
}

export interface LiveGoal {
  t: number;
  period: number;
  timeInPeriod: string;
  team: TeamSide;
  scorer: string;
  scorerId: number | null;
  seasonGoals: number | null;
  assists: { name: string; seasonAssists: number | null }[];
  strength: string | null;
  shotType: string | null;
  distance: number | null;
  xg: number | null;
  goalie: string | null;
  awayScore: number;
  homeScore: number;
  headshot: string | null;
  highlightUrl: string | null;
  /** Play-by-play event ID; goal replays are keyed by it. */
  eventId: number | null;
  /** The NHL has player and puck tracking for this goal's build-up. */
  hasReplay: boolean;
}

export interface LivePenalty {
  t: number;
  period: number;
  timeInPeriod: string;
  team: TeamSide;
  player: string;
  infraction: string;
  type: string;
  minutes: number;
  drawnBy: string | null;
  /** What the other team did while the penalty ran. */
  powerPlayGoal: string | null;
  powerPlayAttempts: number;
  powerPlayXg: number;
}

export interface LiveSkater {
  playerId: number;
  team: TeamSide;
  number: number;
  name: string;
  position: string;
  goals: number;
  assists: number;
  points: number;
  plusMinus: number;
  pim: number;
  shotsOnGoal: number;
  hits: number;
  hitsTaken: number;
  blocks: number;
  giveaways: number;
  takeaways: number;
  faceoffWins: number;
  faceoffLosses: number;
  powerPlayGoals: number;
  toiSeconds: number;
  shifts: number;
  /** Seconds at each strength, from shift data. */
  toiEv: number;
  toiPp: number;
  toiSh: number;
  attempts: number;
  unblocked: number;
  ixg: number;
  highDanger: number;
  onIceAttemptsFor: number;
  onIceAttemptsAgainst: number;
  onIceXgFor: number;
  onIceXgAgainst: number;
  onIceGoalsFor: number;
  onIceGoalsAgainst: number;
  evAttemptsFor: number;
  evAttemptsAgainst: number;
  penaltiesDrawn: number;
  penaltiesTaken: number;
  primaryAssists: number;
  secondaryAssists: number;
  /** On-ice shot attempts and goals at 5v5 with both goalies in. */
  onIceAttemptsFor5v5: number;
  onIceAttemptsAgainst5v5: number;
  onIceGoalsFor5v5: number;
  onIceGoalsAgainst5v5: number;
  gameScore: LiveGameScore;
}

/**
 * Game Score (Dom Luszczyszyn) and its parts: scoring is goals, assists and
 * shots; onIce is 5v5 shot attempts and goals for and against; other is
 * blocks, penalties and faceoffs.
 */
export interface LiveGameScore {
  total: number;
  scoring: number;
  onIce: number;
  other: number;
}

export interface LiveGoalie {
  playerId: number;
  team: TeamSide;
  number: number;
  name: string;
  toi: string;
  shotsAgainst: number;
  saves: number;
  goalsAgainst: number;
  savePct: number | null;
  /** "saves/shots" splits as the NHL reports them. */
  evenStrength: string | null;
  powerPlay: string | null;
  shorthanded: string | null;
  xgAgainst: number;
  highDangerShots: number;
  highDangerGoals: number;
  decision: string | null;
  season: { gamesPlayed: number; wins: number; gaa: number; savePct: number; shutouts: number } | null;
}

export interface LiveUnit {
  players: string[];
  seconds: number;
  attemptsFor: number;
  attemptsAgainst: number;
  xgFor: number;
  xgAgainst: number;
  goalsFor: number;
  goalsAgainst: number;
}

export interface LiveShift {
  playerId: number;
  start: number;
  end: number;
}

export interface LiveRosterPlayer {
  playerId: number;
  team: TeamSide;
  number: number;
  name: string;
  position: string;
}

export interface LiveOnIcePlayer {
  playerId: number;
  number: number;
  name: string;
  position: string;
  headshot: string | null;
  /** Total time on ice tonight, seconds. */
  toiSeconds: number | null;
}

export interface LiveSeasonContext {
  gamesPlayed: number;
  wins: number;
  losses: number;
  otLosses: number;
  points: number;
  pointPct: number | null;
  goalsFor: number;
  goalsAgainst: number;
  goalDifferential: number;
  streak: string | null;
  homeRecord: string;
  roadRecord: string;
  last10: string;
  division: string | null;
  divisionRank: number | null;
  leagueRank: number | null;
  topScorers: { name: string; gamesPlayed: number; goals: number; assists: number; points: number; plusMinus: number }[];
}

export interface LiveGameResponse {
  meta: LiveGameMeta;
  situation: LiveSituation | null;
  away: LiveTeamInfo;
  home: LiveTeamInfo;
  stats: Record<TeamSide, LiveTeamStats>;
  /** Total seconds at each skater count, keyed "5v5", "5v4" (away v home). */
  timeBySkaters: Record<string, number>;
  strengthSegments: StrengthSegment[];
  /** Home team's win probability (0-1) by game second, from the in-game model. */
  winProbability: { t: number; home: number }[];
  goals: LiveGoal[];
  shots: LiveShot[];
  events: LivePuckEvent[];
  penalties: LivePenalty[];
  /** NHL right-rail power play strings, e.g. "1/3". */
  powerPlay: Record<TeamSide, string | null>;
  skaters: LiveSkater[];
  goalies: LiveGoalie[];
  lines: Record<TeamSide, { forwards: LiveUnit[]; defense: LiveUnit[] }>;
  shifts: LiveShift[];
  roster: LiveRosterPlayer[];
  onIce: Record<TeamSide, LiveOnIcePlayer[]>;
  threeStars: { star: number; name: string; team: string; position: string | null }[];
  stoppages: Record<string, number>;
  officials: { referees: string[]; linesmen: string[] };
  seasonSeries: { awayWins: number; homeWins: number } | null;
  reports: { label: string; url: string }[];
  season: Record<TeamSide, LiveSeasonContext | null>;
}
