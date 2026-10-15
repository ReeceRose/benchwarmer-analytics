// Shot types, situational records, rest, the standings race, travel and the
// playoff bracket (NHL stats API, NHL API and our games table).

export interface ShotTypeRow {
  /** "wrist", "snap", "slap", "backhand", "tipIn", "deflected", "wrapAround", "other". */
  type: string;
  label: string;
  shots: number;
  goals: number;
  shootingPct: number | null;
  /** League shooting % on this shot type (all teams). */
  leagueShootingPct: number | null;
}

export interface ShotTypesResponse {
  /** Season start year the numbers cover; null when there are none. */
  season: number | null;
  /** Most shots first. */
  types: ShotTypeRow[];
}

/** A record in one game situation, with where it ranks. */
export interface SituationRecord {
  key: string;
  label: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  otLosses: number;
  /** Points over points available (0-1). */
  pointsPct: number | null;
  /** League rank by points %, 1 = best; null with no games. */
  rank: number | null;
  /** League points % in this situation (0-1). */
  leaguePointsPct: number | null;
}

export interface TeamSituationsResponse {
  season: number;
  /** Scoring first, leading after periods, one-goal games… */
  results: SituationRecord[];
  /** By days of rest before the game: 0 (back-to-back), 1, 2, 3+. */
  rest: SituationRecord[];
}

export interface GoalieRestSplit {
  /** 0 (back-to-back) to 4 ("4+"). */
  daysRest: number;
  label: string;
  gamesPlayed: number;
  savePct: number | null;
  /** All goalies on this much rest. */
  leagueSavePct: number | null;
}

export interface GoalieRestResponse {
  season: number | null;
  splits: GoalieRestSplit[];
}

export interface RacePoint {
  date: string;
  gamesPlayed: number;
  points: number;
}

export interface RaceTeam {
  team: string;
  division: string | null;
  conference: string | null;
  /** One point per date the team played, oldest first. */
  points: RacePoint[];
}

export interface StandingsRaceResponse {
  season: number;
  teams: RaceTeam[];
}

export interface TeamTravel {
  team: string;
  /** Miles between consecutive game cities, whole regular season. */
  seasonMiles: number;
  /** Miles so far (through the last final game). */
  milesSoFar: number;
  gamesPlayed: number;
  /** Games on consecutive days, whole season. */
  backToBacks: number;
  backToBacksSoFar: number;
  /** Most consecutive road games. */
  longestRoadTrip: number;
}

export interface TravelResponse {
  season: number;
  /** Most miles first. */
  teams: TeamTravel[];
}

export interface BracketTeamSide {
  team: string | null;
  name: string | null;
  /** "D1", "WC2"… */
  seed: string | null;
  wins: number;
  won: boolean;
}

export interface BracketSeries {
  letter: string;
  round: number;
  title: string;
  /**
   * Which half of the bracket: "left" (East in most years) or "right";
   * null for the final.
   */
  half: "left" | "right" | null;
  top: BracketTeamSide;
  bottom: BracketTeamSide;
}

export interface PlayoffBracketResponse {
  /** Season start year (2025 = 2025-26 playoffs). */
  season: number;
  /** Seasons with a bracket, newest first. */
  seasons: number[];
  series: BracketSeries[];
  champion: string | null;
}
