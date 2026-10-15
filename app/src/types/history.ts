// NHL records: milestones, the entry draft, franchise history and goal replays.

/** An active player closing in on a round career number. */
export interface Milestone {
  playerId: number;
  name: string;
  team: string | null;
  position: "skater" | "goalie";
  /** "Points", "Goals", "Assists", "Games Played", "Wins", "Shutouts". */
  milestone: string;
  target: number;
  current: number;
  remaining: number;
  /** Games until the target at the player's career rate; null when there's no rate yet. */
  gamesAway: number | null;
}

export interface MilestonesResponse {
  /** Regular-season milestones, closest first. */
  milestones: Milestone[];
}

/** NHL career totals (every era), from NHL records. */
export interface NhlCareer {
  gamesPlayed: number;
  goals: number | null;
  assists: number | null;
  points: number | null;
  wins: number | null;
  firstSeason: number | null;
  lastSeason: number | null;
  active: boolean;
}

export interface DraftPick {
  draftYear: number;
  round: number;
  pickInRound: number;
  overallPick: number;
  /** Team code at the time (e.g. ATL); `franchiseTeam` is today's code. */
  team: string;
  franchiseTeam: string | null;
  playerId: number | null;
  /** True when we have a player page for them (2008-09 on). */
  hasPlayerPage: boolean;
  name: string;
  position: string | null;
  amateurClub: string | null;
  amateurLeague: string | null;
  countryCode: string | null;
  career: NhlCareer | null;
  inHallOfFame: boolean;
}

export interface DraftClassSummary {
  picks: number;
  /** Picks who played at least one NHL game. */
  playedOne: number;
  /** Picks who played at least 200 NHL games. */
  played200: number;
}

export interface DraftResponse {
  year: number;
  /** Years with draft data, newest first. */
  years: number[];
  team: string | null;
  summary: DraftClassSummary;
  picks: DraftPick[];
  /** That year's draft lottery, when the NHL has one on record. */
  lottery: DraftLottery | null;
}

export interface FranchiseSeason {
  season: number;
  team: string;
  teamName: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  ties: number | null;
  overtimeLosses: number | null;
  points: number;
  pointsPct: number | null;
  goalsFor: number;
  goalsAgainst: number;
  divisionName: string | null;
  divisionRank: number | null;
  leagueRank: number | null;
  madePlayoffs: boolean;
  /** Furthest round reached, e.g. "2nd Round", "Stanley Cup Final". */
  playoffResult: string | null;
  wonCup: boolean;
}

export interface FranchiseHistoryResponse {
  team: string;
  franchiseName: string;
  firstSeason: number;
  /** Oldest first. */
  seasons: FranchiseSeason[];
  playoffAppearances: number;
  cups: number;
  /** First-round picks by year, newest first, with their NHL careers. */
  firstRoundPicks: DraftPick[];
  /** Individual and coaching award winners while with the franchise, newest first. */
  awards: FranchiseAward[];
  people: FranchisePeople;
}

/** One franchise's all-time record against another, from the first team's side. */
export interface AllTimeRecord {
  gamesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  overtimeLosses: number;
  goalsFor: number;
  goalsAgainst: number;
}

export interface GoalReplayEntity {
  /** null for the puck. */
  playerId: number | null;
  team: string | null;
  sweaterNumber: number | null;
  /** NHL rink feet: x from -100 to 100, y from -42.5 to 42.5 (SVG-down). */
  x: number;
  y: number;
}

export interface GoalReplayFrame {
  /** Seconds from the first frame. */
  t: number;
  puck: { x: number; y: number } | null;
  players: GoalReplayEntity[];
}

export interface GoalReplayResponse {
  gameId: string;
  eventId: number;
  /** Ten frames a second. */
  frames: GoalReplayFrame[];
}

export type TrophyCategory = "team" | "player" | "coach" | "gm" | "other";

/** One winner, runner-up or finalist of a trophy. */
export interface AwardEntry {
  season: number;
  /** "WINNER", "RUNNER_UP" or "FINALIST". */
  status: string;
  name: string;
  playerId: number | null;
  hasPlayerPage: boolean;
  /** Team code that season (players and teams). */
  team: string | null;
  isRookie: boolean;
}

export interface TrophySummary {
  id: number;
  name: string;
  slug: string;
  category: TrophyCategory;
  description: string | null;
  imageUrl: string | null;
  /** Winners of the latest season awarded (two when shared). */
  latestWinners: AwardEntry[];
}

export interface TrophiesResponse {
  trophies: TrophySummary[];
}

export interface TrophySeason {
  season: number;
  winners: AwardEntry[];
  /** Runners-up and finalists. */
  others: AwardEntry[];
}

export interface TrophyRaceLeader {
  playerId: number;
  name: string;
  team: string | null;
  value: number;
  display: string;
}

/** This season's leaders in the stat closest to a trophy (our numbers, not a vote prediction). */
export interface TrophyRace {
  season: number;
  /** What the leaders are ranked by, e.g. "Points" or "Game Score". */
  stat: string;
  /** Why this stat, and how far it goes as a predictor. */
  note: string;
  leaders: TrophyRaceLeader[];
}

export interface TrophyResponse {
  trophy: TrophySummary;
  /** Newest first. */
  seasons: TrophySeason[];
  race: TrophyRace | null;
}

/** A player's trophies: seasons won and seasons a finalist or runner-up. */
export interface PlayerAward {
  trophy: string;
  slug: string;
  wins: number[];
  finalist: number[];
}

/** A franchise's individual award winners. */
export interface FranchiseAward extends AwardEntry {
  trophy: string;
  slug: string;
}

export type MilestoneKind = "points-1000" | "goals-500" | "season-points-100" | "season-goals-50";

/** The game a 1,000th point, 500th goal, 100th point or 50th goal of a season came in. */
export interface MilestoneMoment {
  kind: MilestoneKind;
  playerId: number;
  name: string;
  hasPlayerPage: boolean;
  season: number;
  gameId: string;
  gameDate: string;
  /** The player's team name then. */
  team: string | null;
  homeTeam: string | null;
  awayTeam: string | null;
  homeScore: number | null;
  awayScore: number | null;
  ageYears: number | null;
  /** Career games (career milestones) or the season's games (season milestones) at the time. */
  gamesPlayed: number | null;
  /** Season milestones: the season's final total. */
  seasonTotal: number | null;
  /** The goalie in net, when the NHL records one. */
  goalie: string | null;
  active: boolean;
}

export interface MilestoneClubResponse {
  kind: MilestoneKind;
  label: string;
  /** Members in each club. */
  counts: Record<MilestoneKind, number>;
  /** Newest first. */
  moments: MilestoneMoment[];
}

/** A goalie's playoff career in the big moments. */
export interface GoaliePlayoffRecord {
  games: number;
  gameSevenWins: number;
  gameSevenLosses: number;
  overtimeWins: number;
  overtimeLosses: number;
  overtimeSavePct: number | null;
}

export interface FranchisePerson {
  name: string;
  /** As the NHL writes it: "2016-17 – Present", "Oct. 8, 2015 – Nov. 18, 2018". */
  tenure: string | null;
}

export interface FranchisePeople {
  /** Newest first. */
  captains: FranchisePerson[];
  coaches: (FranchisePerson & { stanleyCups: number | null; inHallOfFame: boolean })[];
  generalManagers: FranchisePerson[];
  /** By number. */
  retiredNumbers: (FranchisePerson & { number: number | null })[];
}

export interface Official {
  id: number;
  name: string;
  /** "Referee" or "Linesperson". */
  type: string;
  sweaterNumber: number | null;
  firstSeason: number | null;
  firstPlayoffSeason: number | null;
  countryCode: string | null;
}

export interface OfficialsResponse {
  /** Active officials. */
  officials: Official[];
}

export interface AttendanceSeason {
  season: number;
  regular: number | null;
  playoffs: number | null;
  total: number | null;
}

export interface AttendanceResponse {
  /** Oldest first. */
  seasons: AttendanceSeason[];
}

/** A draft lottery's format and odds, as plain text plus the NHL's odds chart. */
export interface DraftLottery {
  format: string | null;
  oddsImageUrl: string | null;
  notes: string | null;
  results: string | null;
}

export interface StreakEntry {
  playerId: number;
  name: string;
  team: string;
  position: string;
  /** Games in the current streak. */
  games: number;
  /** Points in those games. */
  points: number;
  /** Total Game Score in those games. */
  gameScore: number;
  lastGameDate: string;
  /** The streak runs back to a game we have no data for, so it may be longer. */
  atLeast: boolean;
}

export interface StreaksResponse {
  season: number | null;
  /** Latest date with games. */
  asOf: string | null;
  /** Current runs of games with a point, longest first. */
  points: StreakEntry[];
  /** Current runs of games with a Game Score of 1.0 or more. */
  gameScore: StreakEntry[];
}
