// NHL EDGE tracking (player and puck tracking, 2021-22 on).

/** A tracked stat with the league average. */
export interface TrackingMetric {
  value: number | null;
  leagueAverage: number | null;
  /**
   * Players: share of the league this beats (0-1), oriented so higher is
   * better (less defensive-zone time scores high). Null for teams.
   */
  percentile: number | null;
  /** Teams: league rank, 1 = best. Null for players. */
  rank: number | null;
}

/** When a peak (top speed, hardest shot) happened. */
export interface TrackingMoment {
  gameDate: string;
  away: string | null;
  home: string | null;
  period: number | null;
  timeInPeriod: string | null;
  /** Who did it; only set on team stats. */
  playerName: string | null;
}

export interface TrackingPeak extends TrackingMetric {
  moment: TrackingMoment | null;
}

/** Shots on goal, goals and shooting % from one distance band. */
export interface TrackingShotArea {
  /** "all", "high" (high danger), "mid" or "long". */
  area: string;
  shots: TrackingMetric;
  goals: TrackingMetric;
  shootingPct: TrackingMetric;
}

export interface TrackingZoneTime {
  offensive: TrackingMetric;
  neutral: TrackingMetric;
  defensive: TrackingMetric;
}

/**
 * One of the NHL's 17 EDGE rink areas ("High Slot", "L Circle", "Beyond Red
 * Line"…): shots on goal (skaters, teams) or save % (goalies) from there.
 */
export interface TrackingArea {
  area: string;
  value: number | null;
  /** Players: 0-1, higher is better. */
  percentile: number | null;
  /** Teams: 1 = best. */
  rank: number | null;
  /** Goalies: saves from the area. */
  saves: number | null;
}

export interface SkaterTracking {
  kind: "skater";
  /** Season start year the numbers cover (the latest with tracking data). */
  season: number;
  gamesPlayed: number | null;
  /** Miles per hour. */
  topSpeed: TrackingPeak;
  /** Times over 20 mph. */
  burstsOver20: TrackingMetric;
  /** Miles, season total. */
  totalDistance: TrackingMetric;
  /** Miles, best single game. */
  maxGameDistance: TrackingPeak;
  /** Miles per hour. */
  hardestShot: TrackingPeak;
  shotAreas: TrackingShotArea[];
  /** Shares of on-ice time (0-1), all strengths. */
  zoneTime: TrackingZoneTime;
  /** Shots on goal from each rink area. */
  rinkAreas: TrackingArea[];
}

export interface GoalieTrackingArea {
  /** "all", "high" (high danger), "mid" or "long". */
  area: string;
  saves: number;
  goalsAgainst: number;
  savePct: TrackingMetric;
}

export interface GoalieTracking {
  kind: "goalie";
  season: number;
  gamesPlayed: number | null;
  areas: GoalieTrackingArea[];
  /** Share of games with a save % above .900 (0-1). */
  gamesAbove900: TrackingMetric;
  goalDifferentialPer60: TrackingMetric;
  goalSupport: TrackingMetric;
  /** Save % from each rink area. */
  rinkAreas: TrackingArea[];
}

/** A player's EDGE numbers, or null when the NHL has none (pre-2021 or no games). */
export type PlayerTrackingResponse = { tracking: SkaterTracking | GoalieTracking | null };

export interface TeamTracking {
  season: number;
  gamesPlayed: number | null;
  topSpeed: TrackingPeak;
  burstsOver20: TrackingMetric;
  burstsOver22: TrackingMetric;
  /** Miles, season total. */
  totalDistance: TrackingMetric;
  hardestShot: TrackingPeak;
  shotsOver90: TrackingMetric;
  shotAreas: TrackingShotArea[];
  zoneTime: TrackingZoneTime;
  /** Shots on goal from each rink area, with league ranks. */
  rinkAreas: TrackingArea[];
}

export type TeamTrackingResponse = { tracking: TeamTracking | null };

export type TrackingLeaderPosition = "all" | "F" | "D";

export interface TrackingLeader {
  playerId: number | null;
  name: string;
  team: string | null;
  position: string | null;
  headshot: string | null;
  value: number;
  /** A second number for context, e.g. bursts over 22 mph. */
  detail: string | null;
  /** When a peak happened (top speed, hardest shot). */
  moment: TrackingMoment | null;
}

export interface TrackingLeaderBoard {
  key: string;
  title: string;
  /** "mph", "mi", "%" or "" (a count). */
  unit: string;
  leaders: TrackingLeader[];
}

export interface TrackingLeadersResponse {
  season: number;
  position: TrackingLeaderPosition;
  boards: TrackingLeaderBoard[];
}
