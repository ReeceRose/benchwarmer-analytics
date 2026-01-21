/** Leader entry for leaderboard display */
export interface LeaderEntry {
  playerId: number;
  name: string;
  team?: string;
  position?: string;
  value: number;
}

/** Outlier entry showing goals vs xG differential */
export interface OutlierEntry {
  playerId: number;
  name: string;
  team?: string;
  position?: string;
  goals: number;
  expectedGoals: number;
  differential: number;
}

/** Player info for line display */
export interface LinePlayer {
  playerId: number;
  name: string;
  position?: string;
}

/** Top line combination */
export interface TopLine {
  id: number;
  team: string;
  players: LinePlayer[];
  iceTimeSeconds: number;
  expectedGoalsPct?: number;
  goalsFor: number;
  goalsAgainst: number;
}

/** Leaderboards for different stat categories */
export interface Leaderboards {
  points: LeaderEntry[];
  goals: LeaderEntry[];
  expectedGoals: LeaderEntry[];
  corsiPct: LeaderEntry[];
  iceTime: LeaderEntry[];
}

/** Goalie leaderboards */
export interface GoalieLeaderboards {
  savePct: LeaderEntry[];
  goalsAgainstAvg: LeaderEntry[];
  goalsSavedAboveExpected: LeaderEntry[];
}

/** Outliers grouped by performance direction */
export interface Outliers {
  runningHot: OutlierEntry[];
  runningCold: OutlierEntry[];
}

/** Goalie outlier entry showing GA vs xGA differential */
export interface GoalieOutlierEntry {
  playerId: number;
  name: string;
  team?: string;
  goalsAgainst: number;
  expectedGoalsAgainst: number;
  goalsSavedAboveExpected: number;
}

/** Goalie outliers grouped by performance direction */
export interface GoalieOutliers {
  runningHot: GoalieOutlierEntry[];
  runningCold: GoalieOutlierEntry[];
}

/** League-wide averages for comparison */
export interface LeagueAverages {
  corsiPct: number;
  expectedGoalsPct: number;
}

/** Response from GET /api/stats/homepage */
export interface HomepageDataResponse {
  season: number;
  situation: string;
  leaders: Leaderboards;
  outliers: Outliers;
  topLines: TopLine[];
  leagueAverages: LeagueAverages;
  goalieLeaders: GoalieLeaderboards;
  goalieOutliers: GoalieOutliers;
}
