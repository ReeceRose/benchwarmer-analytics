// Live NHL API reads used by request handlers. A failed request (HTTP error,
// network error, timeout) yields null / empty instead of failing the endpoint.
// Response types list only the fields the API reads; callers treat missing
// numbers as 0 and missing strings as "".

import { addDays } from "@/server/api/format";
import { scheduleToGames, type NhlScheduleResponse, type ScheduledGame } from "@/server/ingestion/nhl";

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
  regulationWins?: number;
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

export interface NhlPeriodDescriptor {
  number?: number;
  periodType?: string | null;
}

export interface NhlClock {
  timeRemaining?: string | null;
  secondsRemaining?: number | null;
  running?: boolean;
  inIntermission?: boolean;
}

export interface NhlSituation {
  homeTeam?: { abbrev?: string; strength?: number; situationDescriptions?: string[] | null } | null;
  awayTeam?: { abbrev?: string; strength?: number; situationDescriptions?: string[] | null } | null;
  situationCode?: string | null;
  timeRemaining?: string | null;
}

export interface NhlPenalty {
  timeInPeriod?: string;
  type?: string | null;
  duration?: number;
  descKey?: string | null;
  teamAbbrev?: Localized | null;
  committedByPlayer?: { firstName?: Localized | null; lastName?: Localized | null; sweaterNumber?: number } | null;
  servedBy?: Localized | string | null;
  drawnBy?: { firstName?: Localized | null; lastName?: Localized | null; sweaterNumber?: number } | null;
}

export interface NhlIceSurfacePlayer {
  playerId?: number;
  name?: Localized | null;
  sweaterNumber?: number;
  positionCode?: string | null;
  headshot?: string | null;
  totalSOI?: number | null;
}

export interface NhlIceSurfaceTeam {
  forwards?: NhlIceSurfacePlayer[];
  defensemen?: NhlIceSurfacePlayer[];
  goalies?: NhlIceSurfacePlayer[];
  penaltyBox?: NhlIceSurfacePlayer[];
}

export interface NhlThreeStar {
  star?: number;
  playerId?: number;
  teamAbbrev?: string | Localized | null;
  name?: Localized | string | null;
  position?: string | null;
}

export interface NhlGameLanding {
  id?: number;
  gameState?: string;
  gameDate?: string;
  startTimeUTC?: string | null;
  venue?: Localized | null;
  venueLocation?: Localized | null;
  tvBroadcasts?: { network?: string; countryCode?: string; market?: string }[] | null;
  periodDescriptor?: NhlPeriodDescriptor | null;
  clock?: NhlClock | null;
  situation?: NhlSituation | null;
  awayTeam?: { abbrev?: string; score?: number | null; sog?: number | null; placeName?: Localized | null; commonName?: Localized | null };
  homeTeam?: { abbrev?: string; score?: number | null; sog?: number | null; placeName?: Localized | null; commonName?: Localized | null };
  summary?: {
    scoring?: { periodDescriptor?: NhlPeriodDescriptor | null; goals?: (NhlScoringGoal & { shotType?: string | null; headshot?: string | null; highlightClipSharingUrl?: string | null })[] }[];
    penalties?: { periodDescriptor?: NhlPeriodDescriptor | null; penalties?: NhlPenalty[] }[];
    threeStars?: NhlThreeStar[] | null;
    iceSurface?: { awayTeam?: NhlIceSurfaceTeam | null; homeTeam?: NhlIceSurfaceTeam | null } | null;
  } | null;
}

export function getGameLanding(gameId: string): Promise<NhlGameLanding | null> {
  return getJson<NhlGameLanding>(`${NHL_API}/gamecenter/${encodeURIComponent(gameId)}/landing`);
}

export interface NhlPlay {
  eventId?: number;
  sortOrder?: number;
  periodDescriptor?: NhlPeriodDescriptor | null;
  timeInPeriod?: string;
  situationCode?: string | null;
  homeTeamDefendingSide?: string | null;
  typeDescKey?: string;
  details?: {
    eventOwnerTeamId?: number;
    xCoord?: number | null;
    yCoord?: number | null;
    zoneCode?: string | null;
    shotType?: string | null;
    reason?: string | null;
    descKey?: string | null;
    typeCode?: string | null;
    duration?: number | null;
    shootingPlayerId?: number;
    scoringPlayerId?: number;
    assist1PlayerId?: number;
    assist2PlayerId?: number;
    goalieInNetId?: number;
    blockingPlayerId?: number;
    hittingPlayerId?: number;
    hitteePlayerId?: number;
    winningPlayerId?: number;
    losingPlayerId?: number;
    committedByPlayerId?: number;
    drawnByPlayerId?: number;
    servedByPlayerId?: number;
    playerId?: number;
    highlightClipSharingUrl?: string | null;
  } | null;
  /** Goals only: tracking data for the build-up (see getGoalReplay). */
  pptReplayUrl?: string | null;
}

export interface NhlRosterSpot {
  teamId?: number;
  playerId?: number;
  firstName?: Localized | null;
  lastName?: Localized | null;
  sweaterNumber?: number;
  positionCode?: string;
  headshot?: string | null;
}

export interface NhlPlayByPlay {
  id?: number;
  gameState?: string;
  awayTeam?: { id?: number; abbrev?: string };
  homeTeam?: { id?: number; abbrev?: string };
  plays?: NhlPlay[];
  rosterSpots?: NhlRosterSpot[];
}

export function getPlayByPlay(gameId: string): Promise<NhlPlayByPlay | null> {
  return getJson<NhlPlayByPlay>(`${NHL_API}/gamecenter/${encodeURIComponent(gameId)}/play-by-play`);
}

export interface NhlRightRail {
  seasonSeriesWins?: { awayTeamWins?: number; homeTeamWins?: number } | null;
  gameInfo?: {
    referees?: { default?: string; fullName?: Localized; sweaterNumber?: number }[];
    linesmen?: { default?: string; fullName?: Localized; sweaterNumber?: number }[];
    awayTeam?: { headCoach?: Localized | null; scratches?: { firstName?: Localized; lastName?: Localized }[] } | null;
    homeTeam?: { headCoach?: Localized | null; scratches?: { firstName?: Localized; lastName?: Localized }[] } | null;
  } | null;
  teamGameStats?: { category?: string; awayValue?: string | number; homeValue?: string | number }[];
  gameReports?: Record<string, string> | null;
}

export function getRightRail(gameId: string): Promise<NhlRightRail | null> {
  return getJson<NhlRightRail>(`${NHL_API}/gamecenter/${encodeURIComponent(gameId)}/right-rail`);
}

export interface NhlClubStats {
  skaters?: {
    playerId?: number;
    firstName?: Localized;
    lastName?: Localized;
    gamesPlayed?: number;
    goals?: number;
    assists?: number;
    points?: number;
    plusMinus?: number;
  }[];
  goalies?: {
    playerId?: number;
    gamesPlayed?: number;
    wins?: number;
    goalsAgainstAverage?: number;
    savePercentage?: number;
    shutouts?: number;
  }[];
}

// Current regular-season player stats for a team.
export function getClubStats(team: string): Promise<NhlClubStats | null> {
  return getJson<NhlClubStats>(`${NHL_API}/club-stats/${encodeURIComponent(team)}/now`);
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
  highlightClipSharingUrl?: string | null;
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

// Schedule week starting at `date` (YYYY-MM-DD), as game rows.
export async function getScheduleWeek(date: string): Promise<ScheduledGame[]> {
  const response = await getJson<NhlScheduleResponse>(`${NHL_API}/schedule/${date}`);
  return response ? scheduleToGames(response) : [];
}

// Games dated within [start, end], a week per request, by date then ID.
export async function getGamesForDateRange(start: string, end: string): Promise<ScheduledGame[]> {
  const starts: string[] = [];
  for (let date = start; date <= end; date = addDays(date, 7)) starts.push(date);
  const weeks = await Promise.all(starts.map(getScheduleWeek));
  const byId = new Map<string, ScheduledGame>();
  for (const game of weeks.flat()) {
    if (game.gameDate >= start && game.gameDate <= end && !byId.has(game.gameId)) byId.set(game.gameId, game);
  }
  return [...byId.values()].sort((a, b) => a.gameDate.localeCompare(b.gameDate) || a.gameId.localeCompare(b.gameId));
}

const STATS_API = "https://api.nhle.com/stats/rest/en";

// The stats API keys teams by full name.
const TEAM_NAME_TO_ABBREV: Record<string, string> = {
  "Anaheim Ducks": "ANA", "Boston Bruins": "BOS", "Buffalo Sabres": "BUF", "Calgary Flames": "CGY",
  "Carolina Hurricanes": "CAR", "Chicago Blackhawks": "CHI", "Colorado Avalanche": "COL",
  "Columbus Blue Jackets": "CBJ", "Dallas Stars": "DAL", "Detroit Red Wings": "DET", "Edmonton Oilers": "EDM",
  "Florida Panthers": "FLA", "Los Angeles Kings": "LAK", "Minnesota Wild": "MIN", "Montréal Canadiens": "MTL",
  "Nashville Predators": "NSH", "New Jersey Devils": "NJD", "New York Islanders": "NYI", "New York Rangers": "NYR",
  "Ottawa Senators": "OTT", "Philadelphia Flyers": "PHI", "Pittsburgh Penguins": "PIT", "San Jose Sharks": "SJS",
  "Seattle Kraken": "SEA", "St. Louis Blues": "STL", "Tampa Bay Lightning": "TBL", "Toronto Maple Leafs": "TOR",
  // Utah Hockey Club in 2024-25, Utah Mammoth since.
  "Utah Hockey Club": "UTA", "Utah Mammoth": "UTA", "Vancouver Canucks": "VAN", "Vegas Golden Knights": "VGK",
  "Washington Capitals": "WSH", "Winnipeg Jets": "WPG",
};

export interface NhlTeamSpecialTeams {
  powerPlayPct: number | null;
  penaltyKillPct: number | null;
  faceoffWinPct: number | null;
}

// Official regular-season PP%/PK% (fractions) by team abbreviation.
export async function getTeamSpecialTeams(season: number): Promise<Map<string, NhlTeamSpecialTeams>> {
  const seasonId = `${season}${season + 1}`;
  const response = await getJson<{
    data?: { teamFullName?: string | null; powerPlayPct?: number | null; penaltyKillPct?: number | null; faceoffWinPct?: number | null }[];
  }>(`${STATS_API}/team/summary?cayenneExp=seasonId=${seasonId}&cayenneExp=gameTypeId=2`);
  const result = new Map<string, NhlTeamSpecialTeams>();
  for (const t of response?.data ?? []) {
    if (!t.teamFullName) continue;
    // Unknown names fall back to their first three letters.
    const abbrev = TEAM_NAME_TO_ABBREV[t.teamFullName] ?? t.teamFullName.slice(0, 3).toUpperCase();
    result.set(abbrev, {
      powerPlayPct: t.powerPlayPct ?? null,
      penaltyKillPct: t.penaltyKillPct ?? null,
      faceoffWinPct: t.faceoffWinPct ?? null,
    });
  }
  return result;
}

export interface NhlShift {
  playerId?: number;
  teamId?: number;
  period?: number;
  startTime?: string | null;
  endTime?: string | null;
  /** 517 = a shift; other codes are goal markers. */
  typeCode?: number;
}

// Every shift so far. This feed trails play-by-play by a few minutes.
export async function getShiftChart(gameId: string): Promise<NhlShift[]> {
  const response = await getJson<{ data?: NhlShift[] }>(
    `${STATS_API}/shiftcharts?cayenneExp=gameId=${encodeURIComponent(gameId)}`,
  );
  return response?.data ?? [];
}

// One game in a player's NHL game log. Skaters and goalies share the
// endpoint; each fills its own fields.
export interface NhlPlayerGameLogEntry {
  gameId?: number;
  teamAbbrev?: string;
  opponentAbbrev?: string;
  homeRoadFlag?: string;
  gameDate?: string;
  toi?: string;
  goals?: number;
  assists?: number;
  points?: number;
  plusMinus?: number;
  shots?: number;
  powerPlayPoints?: number;
  // Goalies
  gamesStarted?: number;
  decision?: string | null;
  shotsAgainst?: number;
  goalsAgainst?: number;
  savePctg?: number | null;
}

// A player's game log for a season (start year), newest first. Null when the
// request fails, so callers can tell "unavailable" from "no games".
export async function getPlayerGameLog(
  playerId: number,
  season: number,
  playoffs: boolean,
): Promise<NhlPlayerGameLogEntry[] | null> {
  const response = await getJson<{ gameLog?: NhlPlayerGameLogEntry[] }>(
    `${NHL_API}/player/${playerId}/game-log/${season}${season + 1}/${playoffs ? 3 : 2}`,
  );
  return response ? (response.gameLog ?? []) : null;
}

// --- NHL EDGE (player and puck tracking, 2021-22 on) ---
// Every stat comes with the league average and a percentile (skaters,
// goalies) or rank (teams). Percentiles are oriented so higher is better:
// less defensive-zone time and fewer goals against score high.

export interface NhlEdgeMeasure {
  imperial?: number | null;
  percentile?: number | null;
  rank?: number | null;
  leagueAvg?: { imperial?: number | null } | null;
  overlay?: NhlEdgeOverlay | null;
}

export interface NhlEdgeCount {
  value?: number | null;
  percentile?: number | null;
  rank?: number | null;
  leagueAvg?: number | { value?: number | null } | null;
}

export interface NhlEdgeOverlay {
  player?: { firstName?: Localized | null; lastName?: Localized | null } | null;
  gameDate?: string | null;
  awayTeam?: { abbrev?: string | null } | null;
  homeTeam?: { abbrev?: string | null } | null;
  periodDescriptor?: NhlPeriodDescriptor | null;
  timeInPeriod?: string | null;
}

export interface NhlEdgeSogSummary {
  locationCode?: string;
  shots?: number;
  shotsPercentile?: number | null;
  shotsRank?: number | null;
  shotsLeagueAvg?: number | null;
  goals?: number;
  goalsPercentile?: number | null;
  goalsRank?: number | null;
  goalsLeagueAvg?: number | null;
  shootingPctg?: number | null;
  shootingPctgPercentile?: number | null;
  shootingPctgRank?: number | null;
  shootingPctgLeagueAvg?: number | null;
}

export interface NhlEdgeZoneTime {
  offensiveZonePctg?: number | null;
  offensiveZonePercentile?: number | null;
  offensiveZoneRank?: number | null;
  offensiveZoneLeagueAvg?: number | null;
  neutralZonePctg?: number | null;
  neutralZonePercentile?: number | null;
  neutralZoneRank?: number | null;
  neutralZoneLeagueAvg?: number | null;
  defensiveZonePctg?: number | null;
  defensiveZonePercentile?: number | null;
  defensiveZoneRank?: number | null;
  defensiveZoneLeagueAvg?: number | null;
}

export interface NhlEdgeAreaDetail {
  area?: string;
  shots?: number;
  shotsPercentile?: number | null;
  shotsRank?: number | null;
  saves?: number;
  savePctg?: number | null;
  savePctgPercentile?: number | null;
}

export interface NhlEdgeSeasons {
  seasonsWithEdgeStats?: { id?: number; gameTypes?: number[] }[];
}

export interface NhlEdgeSkaterDetail extends NhlEdgeSeasons {
  player?: { gamesPlayed?: number | null; position?: string | null } | null;
  topShotSpeed?: NhlEdgeMeasure | null;
  skatingSpeed?: { speedMax?: NhlEdgeMeasure | null; burstsOver20?: NhlEdgeCount | null } | null;
  totalDistanceSkated?: NhlEdgeMeasure | null;
  distanceMaxGame?: NhlEdgeMeasure | null;
  sogSummary?: NhlEdgeSogSummary[];
  sogDetails?: NhlEdgeAreaDetail[];
  zoneTimeDetails?: NhlEdgeZoneTime | null;
}

export interface NhlEdgeGoalieDetail extends NhlEdgeSeasons {
  player?: { gamesPlayed?: number | null } | null;
  stats?: Record<string, { value?: number | null; percentile?: number | null; leagueAvg?: number | null } | undefined> | null;
  shotLocationSummary?: {
    locationCode?: string;
    goalsAgainst?: number;
    saves?: number;
    savePctg?: number | null;
    savePctgPercentile?: number | null;
    savePctgLeagueAvg?: number | null;
  }[];
  shotLocationDetails?: NhlEdgeAreaDetail[];
}

export interface NhlEdgeTeamDetail extends NhlEdgeSeasons {
  team?: { gamesPlayed?: number | null } | null;
  shotSpeed?: { topShotSpeed?: NhlEdgeMeasure | null; shotAttemptsOver90?: NhlEdgeCount | null } | null;
  skatingSpeed?: { speedMax?: NhlEdgeMeasure | null; burstsOver20?: NhlEdgeCount | null; burstsOver22?: NhlEdgeCount | null } | null;
  distanceSkated?: { total?: NhlEdgeMeasure | null } | null;
  sogSummary?: NhlEdgeSogSummary[];
  sogDetails?: NhlEdgeAreaDetail[];
  zoneTimeDetails?: NhlEdgeZoneTime | null;
}

// `season` is a start year; omitted means the NHL's "now", which falls back
// to the player's latest season with tracking data.
const edgeSuffix = (season?: number) => (season === undefined ? "now" : `${season}${season + 1}/2`);

export function getEdgeSkaterDetail(playerId: number, season?: number): Promise<NhlEdgeSkaterDetail | null> {
  return getJson<NhlEdgeSkaterDetail>(`${NHL_API}/edge/skater-detail/${playerId}/${edgeSuffix(season)}`);
}

export function getEdgeGoalieDetail(playerId: number, season?: number): Promise<NhlEdgeGoalieDetail | null> {
  return getJson<NhlEdgeGoalieDetail>(`${NHL_API}/edge/goalie-detail/${playerId}/${edgeSuffix(season)}`);
}

export function getEdgeTeamDetail(teamId: number, season?: number): Promise<NhlEdgeTeamDetail | null> {
  return getJson<NhlEdgeTeamDetail>(`${NHL_API}/edge/team-detail/${teamId}/${edgeSuffix(season)}`);
}

// --- Milestones (players close to a round career number) ---

export interface NhlMilestone {
  playerId?: number;
  playerFullName?: string | null;
  teamAbbrev?: string | null;
  gameTypeId?: number;
  milestone?: string | null;
  milestoneAmount?: number;
  gamesPlayed?: number;
  // Skaters
  goals?: number;
  assists?: number;
  points?: number;
  // Goalies
  wins?: number;
  so?: number;
  toiMinutes?: number;
}

export async function getMilestones(kind: "skaters" | "goalies"): Promise<NhlMilestone[] | null> {
  const response = await getJson<{ data?: NhlMilestone[] }>(`${STATS_API}/milestones/${kind}`);
  return response ? (response.data ?? []) : null;
}

// --- Goal replays (player and puck tracking for the seconds before a goal) ---

export interface NhlReplayEntity {
  id?: number;
  /** Empty for the puck. */
  playerId?: number | string;
  x?: number;
  y?: number;
  sweaterNumber?: number | string;
  teamAbbrev?: string;
}

export interface NhlReplayFrame {
  /** Tenths of a second. */
  timeStamp?: number;
  onIce?: Record<string, NhlReplayEntity>;
}

// The sprite host only answers requests that look like they come from
// nhl.com, so this sends its Referer. Null if it refuses or the goal has no
// tracking.
export async function getGoalReplay(season: number, gameId: string, eventId: number): Promise<NhlReplayFrame[] | null> {
  const url = `https://wsr.nhle.com/sprites/${season}${season + 1}/${encodeURIComponent(gameId)}/ev${eventId}.json`;
  try {
    const response = await fetch(url, {
      headers: { "user-agent": USER_AGENT, referer: "https://www.nhl.com/" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      console.warn(`NHL replay ${url}: HTTP ${response.status}`);
      return null;
    }
    const frames = (await response.json()) as unknown;
    return Array.isArray(frames) ? (frames as NhlReplayFrame[]) : null;
  } catch (error) {
    console.warn(`NHL replay ${url}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

export interface NhlCareerTotals {
  gamesPlayed?: number;
  goals?: number;
  assists?: number;
  points?: number;
  wins?: number;
  shutouts?: number;
}

// Current regular-season career totals for some players, keyed by player ID
// (the stats API summed over every season). Null if the request fails.
export async function getCareerTotals(kind: "skater" | "goalie", playerIds: number[]): Promise<Map<number, NhlCareerTotals> | null> {
  if (playerIds.length === 0) return new Map();
  const filter = `gameTypeId=2 and seasonId>=19171918 and seasonId<=21002101 and playerId in (${playerIds.join(",")})`;
  const params = new URLSearchParams({ isAggregate: "true", isGame: "false", limit: "-1", cayenneExp: filter });
  const response = await getJson<{ data?: (NhlCareerTotals & { playerId?: number })[] }>(`${STATS_API}/${kind}/summary?${params}`);
  if (!response) return null;
  return new Map((response.data ?? []).filter((r) => r.playerId).map((r) => [r.playerId!, r]));
}

// --- Stats API reports (api.nhle.com/stats/rest) ---

// One stats report (e.g. "team/leadingtrailing") filtered by a cayenne
// expression, every row. Null if the request fails.
export async function getStatsReport<T>(report: string, filter: string, aggregate = false): Promise<T[] | null> {
  const params = new URLSearchParams({ isAggregate: String(aggregate), isGame: "false", limit: "-1", cayenneExp: filter });
  const response = await getJson<{ data?: T[] }>(`${STATS_API}/${report}?${params}`);
  return response ? (response.data ?? []) : null;
}

/** Regular season of a start year, as a stats API filter. */
export const regularSeasonFilter = (season: number) => `seasonId=${season}${season + 1} and gameTypeId=2`;

// --- NHL EDGE top 10s ---

export interface NhlEdgeLeader {
  player?: {
    firstName?: Localized | null;
    lastName?: Localized | null;
    /** e.g. "connor-mcdavid-8478402"; the ID is the last part. */
    slug?: string | null;
    headshot?: string | null;
    position?: string | null;
    team?: { abbrev?: string | null } | null;
  } | null;
  maxSpeed?: NhlEdgeMeasure | null;
  hardestShot?: NhlEdgeMeasure | null;
  distanceTotal?: NhlEdgeMeasure | null;
  distancePer60?: NhlEdgeMeasure | null;
  highDanger?: number | null;
  all?: number | null;
  offensiveZoneTime?: number | null;
  burstsOver22?: number | null;
  shotAttemptsOver100?: number | null;
}

// `path` is the part after /edge/, e.g. "skater-speed-top-10/all/max".
export async function getEdgeTop10(path: string, season: number): Promise<NhlEdgeLeader[] | null> {
  const response = await getJson<NhlEdgeLeader[]>(`${NHL_API}/edge/${path}/${season}${season + 1}/2`);
  return Array.isArray(response) ? response : null;
}

// --- Playoff bracket ---

export interface NhlBracketTeam {
  id?: number;
  abbrev?: string | null;
  name?: Localized | null;
}

export interface NhlBracketSeries {
  seriesLetter?: string;
  playoffRound?: number;
  seriesTitle?: string | null;
  topSeedRankAbbrev?: string | null;
  bottomSeedRankAbbrev?: string | null;
  topSeedWins?: number;
  bottomSeedWins?: number;
  winningTeamId?: number | null;
  topSeedTeam?: NhlBracketTeam | null;
  bottomSeedTeam?: NhlBracketTeam | null;
}

// The bracket for the playoffs that end in `endYear` (2026 = 2025-26). Null
// when there's none (yet) or the request fails.
export async function getPlayoffBracket(endYear: number): Promise<NhlBracketSeries[] | null> {
  const response = await getJson<{ series?: NhlBracketSeries[] }>(`${NHL_API}/playoff-bracket/${endYear}`);
  return response?.series?.length ? response.series : null;
}
