// Live NHL API reads used by request handlers. Port of the request-time parts
// of NhlScheduleService. Like the C#, a failed request (HTTP error, network
// error, timeout) yields null / empty instead of failing the endpoint.
// Response types list only the fields the API reads; C# deserialization
// defaulted missing numbers to 0 and strings to "", so callers do the same.

const NHL_API = "https://api-web.nhle.com/v1";
const USER_AGENT = "benchwarmer-analytics (personal hockey analytics project)";
const TIMEOUT_MS = 10_000;

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { headers: { "user-agent": USER_AGENT }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) {
      console.warn(`NHL API ${url}: HTTP ${response.status}`);
      return null;
    }
    return (await response.json()) as T;
  } catch (error) {
    console.warn(`NHL API ${url}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

export interface Localized {
  default?: string | null;
}

export interface NhlTeamStandings {
  teamAbbrev?: Localized | null;
  teamName?: Localized | null;
  gamesPlayed?: number;
  wins?: number;
  losses?: number;
  otLosses?: number;
  points?: number;
  pointPctg?: number | null;
  goalFor?: number;
  goalAgainst?: number;
  goalDifferential?: number;
  streakCode?: string | null;
  streakCount?: number;
  homeWins?: number;
  homeLosses?: number;
  homeOtLosses?: number;
  roadWins?: number;
  roadLosses?: number;
  roadOtLosses?: number;
  l10Wins?: number;
  l10Losses?: number;
  l10OtLosses?: number;
  divisionName?: string | null;
  divisionSequence?: number;
  conferenceName?: string | null;
  conferenceSequence?: number;
  leagueSequence?: number;
  wildcardSequence?: number;
}

// Current standings keyed by team abbreviation (always "now": the NHL API's
// historical standings were unreliable).
export async function getStandings(): Promise<Map<string, NhlTeamStandings>> {
  const response = await getJson<{ standings?: NhlTeamStandings[] }>(`${NHL_API}/standings/now`);
  const standings = new Map<string, NhlTeamStandings>();
  for (const team of response?.standings ?? []) {
    const abbrev = team.teamAbbrev?.default;
    if (abbrev) standings.set(abbrev, team);
  }
  return standings;
}

export interface NhlPlayerName {
  default?: string;
}

export interface NhlSkaterStats {
  playerId?: number;
  sweaterNumber?: number;
  name?: NhlPlayerName;
  position?: string;
  goals?: number;
  assists?: number;
  points?: number;
  plusMinus?: number;
  pim?: number;
  hits?: number;
  powerPlayGoals?: number;
  sog?: number;
  faceoffWinningPctg?: number;
  toi?: string;
  blockedShots?: number;
  shifts?: number;
  giveaways?: number;
  takeaways?: number;
}

export interface NhlGoalieStats {
  playerId?: number;
  sweaterNumber?: number;
  name?: NhlPlayerName;
  position?: string;
  evenStrengthShotsAgainst?: string;
  powerPlayShotsAgainst?: string;
  shorthandedShotsAgainst?: string;
  saveShotsAgainst?: string;
  savePctg?: number | null;
  goalsAgainst?: number;
  toi?: string;
  starter?: boolean;
  decision?: string | null;
  shotsAgainst?: number;
  saves?: number;
  pim?: number;
}

export interface NhlTeamPlayerStats {
  forwards?: NhlSkaterStats[];
  defense?: NhlSkaterStats[];
  goalies?: NhlGoalieStats[];
}

export interface NhlBoxscore {
  id?: number;
  gameState?: string;
  awayTeam?: { id?: number; abbrev?: string; score?: number; sog?: number };
  homeTeam?: { id?: number; abbrev?: string; score?: number; sog?: number };
  playerByGameStats?: { awayTeam?: NhlTeamPlayerStats; homeTeam?: NhlTeamPlayerStats } | null;
}

export function getBoxscore(gameId: string): Promise<NhlBoxscore | null> {
  return getJson<NhlBoxscore>(`${NHL_API}/gamecenter/${encodeURIComponent(gameId)}/boxscore`);
}

export interface NhlGoalAssist {
  playerId?: number;
  name?: NhlPlayerName | null;
  assistsToDate?: number | null;
}

export interface NhlScoringGoal {
  period?: number;
  timeInPeriod?: string;
  playerId?: number;
  name?: NhlPlayerName | null;
  firstName?: NhlPlayerName | null;
  lastName?: NhlPlayerName | null;
  teamAbbrev?: NhlPlayerName | null;
  goalsToDate?: number | null;
  awayScore?: number;
  homeScore?: number;
  strength?: string | null;
  assists?: NhlGoalAssist[];
}

export interface NhlGameLanding {
  id?: number;
  gameState?: string;
  gameDate?: string;
  awayTeam?: { abbrev?: string; score?: number | null };
  homeTeam?: { abbrev?: string; score?: number | null };
  summary?: {
    scoring?: { periodDescriptor?: { periodType?: string | null } | null; goals?: NhlScoringGoal[] }[];
  } | null;
}

export function getGameLanding(gameId: string): Promise<NhlGameLanding | null> {
  return getJson<NhlGameLanding>(`${NHL_API}/gamecenter/${encodeURIComponent(gameId)}/landing`);
}

export interface NhlClubScheduleGame {
  id?: number;
  season?: number;
  gameType?: number;
  gameDate?: string;
  gameState?: string;
  homeTeam?: { abbrev?: string; score?: number | null };
  awayTeam?: { abbrev?: string; score?: number | null };
  periodDescriptor?: { periodType?: string | null } | null;
}

// A team's full season schedule (season code like 20242025).
export async function getTeamSeasonGames(team: string, season: number): Promise<NhlClubScheduleGame[]> {
  const response = await getJson<{ games?: NhlClubScheduleGame[] }>(
    `${NHL_API}/club-schedule-season/${encodeURIComponent(team)}/${season}${season + 1}`,
  );
  return response?.games ?? [];
}

export interface NhlLiveGoal {
  period?: number;
  timeInPeriod?: string;
  playerId?: number;
  name?: NhlPlayerName | null;
  firstName?: NhlPlayerName | null;
  lastName?: NhlPlayerName | null;
  goalModifier?: string | null;
  assists?: NhlGoalAssist[];
  awayScore?: number;
  homeScore?: number;
  teamAbbrev?: string | null;
  strength?: string | null;
}

export interface NhlLiveTeam {
  id?: number;
  name?: { default?: string } | null;
  abbrev?: string;
  score?: number | null;
  sog?: number | null;
  record?: string | null;
  logo?: string | null;
}

export interface NhlLiveGame {
  id?: number;
  season?: number;
  gameType?: number;
  gameDate?: string;
  startTimeUTC?: string | null;
  gameState?: string;
  gameScheduleState?: string;
  period?: number | null;
  periodDescriptor?: { number?: number | null; periodType?: string | null } | null;
  clock?: { timeRemaining?: string | null; secondsRemaining?: number | null; running?: boolean; inIntermission?: boolean } | null;
  awayTeam?: NhlLiveTeam;
  homeTeam?: NhlLiveTeam;
  goals?: NhlLiveGoal[];
}

export interface NhlLiveScores {
  currentDate?: string;
  games?: NhlLiveGame[];
}

export function getLiveScores(): Promise<NhlLiveScores | null> {
  return getJson<NhlLiveScores>(`${NHL_API}/score/now`);
}
