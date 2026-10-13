import { and, asc, desc, eq, gt, gte, inArray, isNotNull, sql } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import { games, goalieSeasons, players, shots, skaterSeasons, teamSeasons } from "@/server/db/schema";
import { CacheTier, json, type ApiContext } from "@/server/api/handler";
import { HttpError } from "@/server/api/errors";
import { addDays, groupBy, round, sum, todayUtc } from "@/server/api/format";
import { DangerZones, GameState, isFinalState, isLiveState } from "@/server/api/constants";
import { calculateDeserveToWin } from "@/server/api/deserve-to-win";
import {
  getBoxscore,
  getGameLanding,
  getGamesForDateRange,
  getLiveScores,
  getScheduleWeek,
  getStandings,
  getTeamSeasonGames,
  getTeamSpecialTeams,
  type NhlBoxscore,
  type NhlClubScheduleGame,
  type NhlGameLanding,
  type NhlLiveGame,
  type NhlLiveGoal,
  type NhlTeamPlayerStats,
  type NhlTeamSpecialTeams,
  type NhlTeamStandings,
} from "@/server/api/nhl-client";
import { todayEastern, type ScheduledGame } from "@/server/ingestion/nhl";
import { TEAM_NAMES } from "@/lib/team-names";

const gameNotFound = () => new HttpError(404, { error: "Game not found", code: "GAME_NOT_FOUND" });

export function teamName(code: string): string | null {
  return TEAM_NAMES[code.toUpperCase()] ?? null;
}

// A game from the DB or the NHL schedule (same shape).
export type GameInfo = ScheduledGame;

const gameColumns = {
  gameId: games.gameId,
  season: games.season,
  gameType: games.gameType,
  gameDate: games.gameDate,
  startTimeUtc: games.startTimeUtc,
  homeTeamCode: games.homeTeamCode,
  awayTeamCode: games.awayTeamCode,
  homeScore: games.homeScore,
  awayScore: games.awayScore,
  gameState: games.gameState,
  periodType: games.periodType,
};

export async function findGame(db: Database, gameId: string): Promise<GameInfo | undefined> {
  const [game] = await db.select(gameColumns).from(games).where(eq(games.gameId, gameId)).limit(1);
  return game;
}

// DB game, else look it up in the NHL schedule around today (UTC).
async function findGameWithFallback(db: Database, gameId: string, daysBack: number, daysAhead: number) {
  const game = await findGame(db, gameId);
  if (game) return game;
  const today = todayUtc();
  const scheduled = await getGamesForDateRange(addDays(today, -daysBack), addDays(today, daysAhead));
  return scheduled.find((g) => g.gameId === gameId);
}

// Season from a YYYY... game ID, else the season in progress (September on).
export function seasonFromGameId(gameId: string): number {
  if (gameId.length >= 4 && /^\d{4}$/.test(gameId.slice(0, 4))) return Number(gameId.slice(0, 4));
  const now = new Date();
  return now.getUTCMonth() + 1 < 9 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
}

interface TeamStats {
  teamCode: string;
  totalShots: number;
  shotsOnGoal: number;
  goals: number;
  expectedGoals: number;
  goalsVsXgDiff: number;
  avgShotDistance: number;
  highDangerChances: number;
  mediumDangerChances: number;
  lowDangerChances: number;
}

interface PeriodStats {
  period: number;
  homeShots: number;
  awayShots: number;
  homeGoals: number;
  awayGoals: number;
  homeXG: number;
  awayXG: number;
}

export interface GameStats {
  gameId: string;
  home: TeamStats;
  away: TeamStats;
  periods: PeriodStats[];
}

interface StatShot {
  gameId: string;
  period: number;
  homeTeamCode: string;
  awayTeamCode: string;
  isHomeTeam: boolean;
  isGoal: boolean;
  shotWasOnGoal: boolean;
  xGoal: number | null;
  shotDistance: number | null;
}

function teamStats(teamCode: string, rows: readonly StatShot[]): TeamStats {
  const goals = rows.filter((s) => s.isGoal).length;
  const xg = sum(rows, (s) => s.xGoal);
  const withDistance = rows.filter((s) => s.shotDistance !== null);
  let high = 0;
  let medium = 0;
  let low = 0;
  for (const s of rows) {
    const shotXg = s.xGoal ?? 0;
    if (shotXg >= DangerZones.highThreshold) high++;
    else if (shotXg >= DangerZones.mediumThreshold) medium++;
    else low++;
  }
  return {
    teamCode,
    totalShots: rows.length,
    shotsOnGoal: rows.filter((s) => s.shotWasOnGoal).length,
    goals,
    expectedGoals: round(xg, 2),
    goalsVsXgDiff: round(goals - xg, 2),
    avgShotDistance: withDistance.length > 0 ? round(sum(withDistance, (s) => s.shotDistance) / withDistance.length, 1) : 0,
    highDangerChances: high,
    mediumDangerChances: medium,
    lowDangerChances: low,
  };
}

// Per-team and per-period shot totals for games
// that have MoneyPuck shot data.
export function buildGameStats(rows: readonly StatShot[]): GameStats[] {
  const result: GameStats[] = [];
  for (const [gameId, gameShots] of groupBy(rows, (s) => s.gameId)) {
    const first = gameShots[0];
    const periods = [...groupBy(gameShots, (s) => s.period)]
      .sort((a, b) => a[0] - b[0])
      .map(([period, ps]) => ({
        period,
        homeShots: ps.filter((s) => s.isHomeTeam).length,
        awayShots: ps.filter((s) => !s.isHomeTeam).length,
        homeGoals: ps.filter((s) => s.isHomeTeam && s.isGoal).length,
        awayGoals: ps.filter((s) => !s.isHomeTeam && s.isGoal).length,
        homeXG: sum(ps.filter((s) => s.isHomeTeam), (s) => s.xGoal),
        awayXG: sum(ps.filter((s) => !s.isHomeTeam), (s) => s.xGoal),
      }));
    result.push({
      gameId,
      home: teamStats(first.homeTeamCode, gameShots.filter((s) => s.isHomeTeam)),
      away: teamStats(first.awayTeamCode, gameShots.filter((s) => !s.isHomeTeam)),
      periods,
    });
  }
  return result;
}

async function gameStatsByGame(db: Database, gameIds: string[]): Promise<Map<string, GameStats>> {
  if (gameIds.length === 0) return new Map();
  const rows = await db
    .select({
      gameId: shots.gameId,
      period: shots.period,
      homeTeamCode: shots.homeTeamCode,
      awayTeamCode: shots.awayTeamCode,
      isHomeTeam: shots.isHomeTeam,
      isGoal: shots.isGoal,
      shotWasOnGoal: shots.shotWasOnGoal,
      xGoal: shots.xGoal,
      shotDistance: shots.shotDistance,
    })
    .from(shots)
    .where(inArray(shots.gameId, gameIds))
    .orderBy(asc(shots.gameId), asc(shots.eventId));
  return new Map(buildGameStats(rows).map((s) => [s.gameId, s]));
}

function record(wins = 0, losses = 0, otLosses = 0): string {
  return `${wins}-${losses}-${otLosses}`;
}

function standingsContext(s: NhlTeamStandings | undefined) {
  return {
    streak: s && s.streakCode ? `${s.streakCode}${s.streakCount ?? 0}` : null,
    homeRecord: s ? record(s.homeWins, s.homeLosses, s.homeOtLosses) : null,
    roadRecord: s ? record(s.roadWins, s.roadLosses, s.roadOtLosses) : null,
    last10: s ? record(s.l10Wins, s.l10Losses, s.l10OtLosses) : null,
  };
}

function teamDto(
  teamCode: string,
  name: string | null,
  goals: number | null,
  stats: TeamStats | undefined,
  shotsOnGoal: number | null | undefined,
  recordText: string | null,
  standings: NhlTeamStandings | undefined,
) {
  const ctx = standingsContext(standings);
  return {
    teamCode,
    teamName: name,
    goals,
    shots: stats?.totalShots ?? null,
    shotsOnGoal: shotsOnGoal ?? null,
    expectedGoals: stats?.expectedGoals ?? null,
    goalsVsXgDiff: stats?.goalsVsXgDiff ?? null,
    highDangerChances: stats?.highDangerChances ?? null,
    mediumDangerChances: stats?.mediumDangerChances ?? null,
    lowDangerChances: stats?.lowDangerChances ?? null,
    avgShotDistance: stats?.avgShotDistance ?? null,
    record: recordText,
    streak: ctx.streak,
    homeRecord: ctx.homeRecord,
    roadRecord: ctx.roadRecord,
    last10: ctx.last10,
  };
}

interface GoalForGwg {
  isHomeGoal: boolean;
  homeScoreAfter: number;
  awayScoreAfter: number;
}

// The game-winning goal: the winner's goal that put them one past the
// loser's final total. None for ties.
export function findGwgIndex(goals: readonly GoalForGwg[], finalHome: number, finalAway: number): number | null {
  const homeWins = finalHome > finalAway;
  const awayWins = finalAway > finalHome;
  if (!homeWins && !awayWins) return null;
  const losingFinal = homeWins ? finalAway : finalHome;
  for (let i = 0; i < goals.length; i++) {
    const g = goals[i];
    if ((homeWins && g.isHomeGoal) || (awayWins && !g.isHomeGoal)) {
      if ((g.isHomeGoal ? g.homeScoreAfter : g.awayScoreAfter) === losingFinal + 1) return i;
    }
  }
  return null;
}

function scorerName(g: { name?: { default?: string } | null; firstName?: { default?: string } | null; lastName?: { default?: string } | null }) {
  return g.name?.default ?? `${g.firstName?.default ?? ""} ${g.lastName?.default ?? ""}`.trim();
}

function assistNames(assists: { name?: { default?: string } | null }[] | undefined): string[] {
  return (assists ?? []).map((a) => a.name?.default ?? "").filter((n) => n !== "");
}

export function liveGoals(
  goals: readonly NhlLiveGoal[],
  finalHome: number | null | undefined,
  finalAway: number | null | undefined,
  homeAbbrev: string,
  completed: boolean,
) {
  if (goals.length === 0 || finalHome == null || finalAway == null) return [];
  const gwg = completed
    ? findGwgIndex(
        goals.map((g) => ({ isHomeGoal: g.teamAbbrev === homeAbbrev, homeScoreAfter: g.homeScore ?? 0, awayScoreAfter: g.awayScore ?? 0 })),
        finalHome,
        finalAway,
      )
    : null;
  return goals.map((g, i) => ({
    period: g.period ?? 0,
    timeInPeriod: g.timeInPeriod ?? "",
    scorerName: scorerName(g),
    scorerId: g.playerId ?? 0,
    teamCode: g.teamAbbrev ?? "",
    strength: g.strength ?? g.goalModifier ?? null,
    assists: assistNames(g.assists),
    isGameWinningGoal: i === gwg,
  }));
}

export function landingGoals(landing: NhlGameLanding, homeTeamCode: string) {
  // Landing goals don't carry their period; it's on the enclosing group.
  const all = (landing.summary?.scoring ?? []).flatMap((p) =>
    (p.goals ?? []).map((g) => ({ ...g, period: g.period ?? p.periodDescriptor?.number })),
  );
  if (all.length === 0) return [];
  const finalHome = landing.homeTeam?.score;
  const finalAway = landing.awayTeam?.score;
  const gwg =
    finalHome == null || finalAway == null
      ? null
      : findGwgIndex(
          all.map((g) => ({
            isHomeGoal: g.teamAbbrev?.default === homeTeamCode,
            homeScoreAfter: g.homeScore ?? 0,
            awayScoreAfter: g.awayScore ?? 0,
          })),
          finalHome,
          finalAway,
        );
  return all.map((g, i) => ({
    period: g.period ?? 0,
    timeInPeriod: g.timeInPeriod ?? "",
    scorerName: scorerName(g),
    scorerId: g.playerId ?? 0,
    teamCode: g.teamAbbrev?.default ?? "",
    strength: g.strength ?? null,
    assists: assistNames(g.assists),
    isGameWinningGoal: i === gwg,
  }));
}

function periodDtos(stats: GameStats | undefined) {
  return stats?.periods ?? [];
}

export function liveGameToDto(
  game: NhlLiveGame,
  stats?: GameStats,
  homeStandings?: NhlTeamStandings,
  awayStandings?: NhlTeamStandings,
  seasonSeries?: string,
) {
  const live = isLiveState(game.gameState);
  const completed = isFinalState(game.gameState);
  const home = game.homeTeam ?? {};
  const away = game.awayTeam ?? {};
  const homeAbbrev = home.abbrev ?? "";
  const awayAbbrev = away.abbrev ?? "";
  const periodType = game.periodDescriptor?.periodType ?? null;
  const gameDate = /^\d{4}-\d{2}-\d{2}$/.test(game.gameDate ?? "") ? (game.gameDate as string) : "0001-01-01";

  return {
    gameId: String(game.id ?? 0),
    gameDate,
    gameState: game.gameState === GameState.finalAlt ? GameState.final : (game.gameState ?? ""),
    startTimeUtc: game.startTimeUTC ?? null,
    home: teamDto(
      homeAbbrev, home.name?.default ?? teamName(homeAbbrev), live || completed ? (home.score ?? null) : null, stats?.home,
      live ? home.sog : stats?.home.shotsOnGoal, home.record ?? null, homeStandings,
    ),
    away: teamDto(
      awayAbbrev, away.name?.default ?? teamName(awayAbbrev), live || completed ? (away.score ?? null) : null, stats?.away,
      live ? away.sog : stats?.away.shotsOnGoal, away.record ?? null, awayStandings,
    ),
    periodType: periodType === "REG" ? null : periodType,
    periods: periodDtos(stats),
    hasShotData: stats !== undefined,
    currentPeriod: game.period ?? null,
    timeRemaining: game.clock?.timeRemaining ?? null,
    inIntermission: game.clock ? (game.clock.inIntermission ?? false) : null,
    goals: liveGoals(game.goals ?? [], home.score, away.score, homeAbbrev, completed),
    seasonSeries: seasonSeries || null,
  };
}

function standingsRecord(s: NhlTeamStandings | undefined): string | null {
  return s ? record(s.wins, s.losses, s.otLosses) : null;
}

export function gameToDto(
  game: GameInfo,
  stats?: GameStats,
  homeStandings?: NhlTeamStandings,
  awayStandings?: NhlTeamStandings,
  seasonSeries?: string,
  goals: ReturnType<typeof landingGoals> | null = null,
) {
  const completed = game.gameState === GameState.final;
  const hasScores = game.homeScore > 0 || game.awayScore > 0;
  return {
    gameId: game.gameId,
    gameDate: game.gameDate,
    gameState: game.gameState,
    startTimeUtc: game.startTimeUtc?.toISOString() ?? null,
    home: teamDto(
      game.homeTeamCode, teamName(game.homeTeamCode), completed || hasScores ? game.homeScore : null, stats?.home,
      stats?.home.shotsOnGoal, standingsRecord(homeStandings), homeStandings,
    ),
    away: teamDto(
      game.awayTeamCode, teamName(game.awayTeamCode), completed || hasScores ? game.awayScore : null, stats?.away,
      stats?.away.shotsOnGoal, standingsRecord(awayStandings), awayStandings,
    ),
    periodType: game.periodType === "REG" ? null : game.periodType,
    periods: periodDtos(stats),
    hasShotData: stats !== undefined,
    currentPeriod: null,
    timeRemaining: null,
    inIntermission: null,
    goals,
    seasonSeries: seasonSeries || null,
  };
}

interface Matchup {
  home: string;
  away: string;
  season: number;
}

function isFinalRegularSeason(g: NhlClubScheduleGame): boolean {
  return isFinalState(g.gameState) && g.gameType === GameState.regularSeason;
}

// "TOR leads 2-1" / "Series tied 1-1" from the home team's schedule; "" when
// they haven't met (or the schedule couldn't be fetched).
export function seasonSeriesText(matchup: Matchup, homeSchedule: readonly NhlClubScheduleGame[] | undefined): string {
  if (!homeSchedule) return "";
  const meetings = homeSchedule.filter(
    (g) => isFinalRegularSeason(g) && (g.homeTeam?.abbrev === matchup.away || g.awayTeam?.abbrev === matchup.away),
  );
  if (meetings.length === 0) return "";
  let homeWins = 0;
  let awayWins = 0;
  for (const g of meetings) {
    const homeWon = (g.homeTeam?.score ?? 0) > (g.awayTeam?.score ?? 0);
    const gameHome = g.homeTeam?.abbrev;
    if ((gameHome === matchup.home && homeWon) || (gameHome === matchup.away && !homeWon)) homeWins++;
    else awayWins++;
  }
  if (homeWins > awayWins) return `${matchup.home} leads ${homeWins}-${awayWins}`;
  if (awayWins > homeWins) return `${matchup.away} leads ${awayWins}-${homeWins}`;
  return `Series tied ${homeWins}-${awayWins}`;
}

async function seasonSeries(matchups: readonly Matchup[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (matchups.length === 0) return result;
  const teamSeasonKeys = [...new Set(matchups.flatMap((m) => [`${m.home}|${m.season}`, `${m.away}|${m.season}`]))];
  const schedules = new Map(
    await Promise.all(
      teamSeasonKeys.map(async (key) => {
        const [team, season] = key.split("|");
        return [key, await getTeamSeasonGames(team, Number(season))] as const;
      }),
    ),
  );
  for (const m of matchups) {
    const key = `${m.home}-${m.away}`;
    if (!result.has(key)) result.set(key, seasonSeriesText(m, schedules.get(`${m.home}|${m.season}`)));
  }
  return result;
}

async function enrichGames(db: Database, list: GameInfo[], standings: Map<string, NhlTeamStandings>, series: Map<string, string>) {
  if (list.length === 0) return [];
  const stats = await gameStatsByGame(db, list.map((g) => g.gameId));
  return list.map((g) =>
    gameToDto(
      g,
      stats.get(g.gameId),
      standings.get(g.homeTeamCode),
      standings.get(g.awayTeamCode),
      series.get(`${g.homeTeamCode}-${g.awayTeamCode}`),
    ),
  );
}

// Stored games for the date, refreshed from the NHL schedule when the date is
// today or later, or any stored game isn't final yet. Nothing is written back:
// the API is read-only and the schedule cron keeps the table current.
async function gamesForDate(db: Database, date: string): Promise<GameInfo[]> {
  const stored = await db.select(gameColumns).from(games).where(eq(games.gameDate, date)).orderBy(asc(games.gameId));
  const refresh = stored.length === 0 || date >= todayEastern() || stored.some((g) => g.gameState !== GameState.final);
  if (!refresh) return stored;
  const scheduled = (await getScheduleWeek(date)).filter((g) => g.gameDate === date);
  return scheduled.length > 0 ? scheduled : stored;
}

async function gamesResponse(db: Database, date: string, filter?: (g: GameInfo) => boolean) {
  const [all, standings] = await Promise.all([gamesForDate(db, date), getStandings()]);
  const list = filter ? all.filter(filter) : all;
  const series = await seasonSeries(list.map((g) => ({ home: g.homeTeamCode, away: g.awayTeamCode, season: g.season })));
  return { date, games: await enrichGames(db, list, standings, series) };
}

export async function getGamesByDate({ db, query }: ApiContext) {
  const raw = query.string("date");
  const date = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) && !Number.isNaN(Date.parse(raw)) ? raw : todayEastern();
  return gamesResponse(db, date);
}

export async function getYesterdaysGames({ db }: ApiContext) {
  return gamesResponse(db, addDays(todayEastern(), -1), (g) => g.gameState === GameState.final || g.homeScore > 0 || g.awayScore > 0);
}

export async function getTodaysGames() {
  const today = todayEastern();
  const now = Date.now();
  const [liveScores, scheduled, standings] = await Promise.all([getLiveScores(), getScheduleWeek(today), getStandings()]);

  // The scoreboard can still include last night's late games.
  const live = (liveScores?.games ?? []).filter((g) => g.gameDate === today);
  const liveIds = new Set(live.map((g) => String(g.id ?? 0)));
  const missing = scheduled.filter((g) => g.gameDate === today && !liveIds.has(g.gameId));

  const series = await seasonSeries([
    ...live.map((g) => ({ home: g.homeTeam?.abbrev ?? "", away: g.awayTeam?.abbrev ?? "", season: seasonFromGameId(String(g.id ?? 0)) })),
    ...missing.map((g) => ({ home: g.homeTeamCode, away: g.awayTeamCode, season: g.season })),
  ]);

  // Started games missing from the scoreboard get their score from the boxscore.
  const started = missing.filter((g) => g.startTimeUtc && g.startTimeUtc.getTime() < now);
  const boxscores = await Promise.all(started.map((g) => getBoxscore(g.gameId)));
  started.forEach((g, i) => {
    const box = boxscores[i];
    if (!box) return;
    g.homeScore = box.homeTeam?.score ?? 0;
    g.awayScore = box.awayTeam?.score ?? 0;
    g.gameState = box.gameState ?? "";
  });

  // No shot stats: a date's shots are ingested the next morning, once it's no
  // longer today. Skipping that query keeps the scores strip (rendered on every
  // page and polled while games are on) off the database.
  const liveDtos = live.map((g) => {
    const home = g.homeTeam?.abbrev ?? "";
    const away = g.awayTeam?.abbrev ?? "";
    return liveGameToDto(g, undefined, standings.get(home), standings.get(away), series.get(`${home}-${away}`));
  });
  const missingDtos = missing.map((g) =>
    gameToDto(g, undefined, standings.get(g.homeTeamCode), standings.get(g.awayTeamCode), series.get(`${g.homeTeamCode}-${g.awayTeamCode}`)),
  );
  const startTime = (t: string | null) => (t ? Date.parse(t) : Number.NEGATIVE_INFINITY);
  const all = [...liveDtos, ...missingDtos].sort((a, b) => startTime(a.startTimeUtc) - startTime(b.startTimeUtc));
  return { date: today, games: all };
}

export async function getLiveGames() {
  const scores = await getLiveScores();
  if (!scores || (scores.games ?? []).length === 0) return { date: todayEastern(), games: [] };
  const date = /^\d{4}-\d{2}-\d{2}$/.test(scores.currentDate ?? "") ? (scores.currentDate as string) : "0001-01-01";
  return { date, games: (scores.games ?? []).map((g) => liveGameToDto(g)) };
}

export async function getGame({ db, params }: ApiContext) {
  const gameId = params.gameId;
  const standingsPromise = getStandings();
  const liveScores = await getLiveScores();
  const liveGame = liveScores?.games?.find((g) => String(g.id ?? 0) === gameId);

  if (liveGame) {
    const home = liveGame.homeTeam?.abbrev ?? "";
    const away = liveGame.awayTeam?.abbrev ?? "";
    const [stats, standings, series] = await Promise.all([
      gameStatsByGame(db, [gameId]),
      standingsPromise,
      seasonSeries([{ home, away, season: seasonFromGameId(gameId) }]),
    ]);
    return liveGameToDto(liveGame, stats.get(gameId), standings.get(home), standings.get(away), series.get(`${home}-${away}`));
  }

  const game = await findGameWithFallback(db, gameId, 7, 7);
  if (!game) throw gameNotFound();

  const [stats, standings, series, landing] = await Promise.all([
    gameStatsByGame(db, [gameId]),
    standingsPromise,
    seasonSeries([{ home: game.homeTeamCode, away: game.awayTeamCode, season: game.season }]),
    game.gameState === GameState.final ? getGameLanding(gameId) : Promise.resolve(null),
  ]);
  const goals = landing?.summary?.scoring ? landingGoals(landing, game.homeTeamCode) : null;
  return gameToDto(
    game,
    stats.get(gameId),
    standings.get(game.homeTeamCode),
    standings.get(game.awayTeamCode),
    series.get(`${game.homeTeamCode}-${game.awayTeamCode}`),
    goals,
  );
}

export async function getGameShots({ db, params }: ApiContext) {
  const game = await findGame(db, params.gameId);
  if (!game) throw gameNotFound();
  const rows = await db
    .select({
      period: shots.period,
      gameSeconds: shots.gameTimeSeconds,
      shooterName: shots.shooterName,
      shooterPlayerId: shots.shooterPlayerId,
      shooterPosition: shots.shooterPosition,
      arenaAdjustedXCoord: shots.arenaAdjustedXCoord,
      arenaAdjustedYCoord: shots.arenaAdjustedYCoord,
      xCoord: shots.xCoord,
      yCoord: shots.yCoord,
      xGoal: shots.xGoal,
      isGoal: shots.isGoal,
      shotWasOnGoal: shots.shotWasOnGoal,
      shotType: shots.shotType,
      shotDistance: shots.shotDistance,
      shotAngle: shots.shotAngle,
      shotRebound: shots.shotRebound,
      shotRush: shots.shotRush,
      homeSkatersOnIce: shots.homeSkatersOnIce,
      awaySkatersOnIce: shots.awaySkatersOnIce,
      goalieName: shots.goalieName,
      isHomeTeam: shots.isHomeTeam,
    })
    .from(shots)
    .where(eq(shots.gameId, game.gameId))
    .orderBy(asc(shots.period), asc(shots.gameTimeSeconds), asc(shots.eventId));

  const dto = (s: (typeof rows)[number]) => ({
    period: s.period,
    gameSeconds: s.gameSeconds,
    shooterName: s.shooterName,
    shooterPlayerId: s.shooterPlayerId,
    shooterPosition: s.shooterPosition,
    xCoord: s.arenaAdjustedXCoord ?? s.xCoord ?? 0,
    yCoord: s.arenaAdjustedYCoord ?? s.yCoord ?? 0,
    xGoal: s.xGoal ?? 0,
    isGoal: s.isGoal,
    shotWasOnGoal: s.shotWasOnGoal,
    shotType: s.shotType,
    shotDistance: s.shotDistance ?? 0,
    shotAngle: s.shotAngle ?? 0,
    shotRebound: s.shotRebound,
    shotRush: s.shotRush,
    homeSkatersOnIce: s.homeSkatersOnIce,
    awaySkatersOnIce: s.awaySkatersOnIce,
    goalieName: s.goalieName,
  });
  return {
    gameId: game.gameId,
    homeTeamCode: game.homeTeamCode,
    awayTeamCode: game.awayTeamCode,
    homeShots: rows.filter((s) => s.isHomeTeam).map(dto),
    awayShots: rows.filter((s) => !s.isHomeTeam).map(dto),
  };
}

export function boxscoreSkaters(team: NhlTeamPlayerStats | undefined) {
  return [...(team?.forwards ?? []), ...(team?.defense ?? [])]
    .sort((a, b) => (b.points ?? 0) - (a.points ?? 0) || (b.goals ?? 0) - (a.goals ?? 0) || (b.sog ?? 0) - (a.sog ?? 0))
    .map((s) => ({
      playerId: s.playerId ?? 0,
      jerseyNumber: s.sweaterNumber ?? 0,
      name: s.name?.default ?? "",
      position: s.position ?? "",
      goals: s.goals ?? 0,
      assists: s.assists ?? 0,
      points: s.points ?? 0,
      plusMinus: s.plusMinus ?? 0,
      penaltyMinutes: s.pim ?? 0,
      hits: s.hits ?? 0,
      shotsOnGoal: s.sog ?? 0,
      blockedShots: s.blockedShots ?? 0,
      giveaways: s.giveaways ?? 0,
      takeaways: s.takeaways ?? 0,
      timeOnIce: s.toi ?? "",
      shifts: s.shifts ?? 0,
      faceoffPct: (s.faceoffWinningPctg ?? 0) * 100,
    }));
}

export function boxscoreGoalies(team: NhlTeamPlayerStats | undefined) {
  return [...(team?.goalies ?? [])]
    .sort((a, b) => Number(b.starter ?? false) - Number(a.starter ?? false))
    .map((g) => ({
      playerId: g.playerId ?? 0,
      jerseyNumber: g.sweaterNumber ?? 0,
      name: g.name?.default ?? "",
      shotsAgainst: g.shotsAgainst ?? 0,
      saves: g.saves ?? 0,
      goalsAgainst: g.goalsAgainst ?? 0,
      savePct: g.savePctg ?? null,
      timeOnIce: g.toi ?? "",
      starter: g.starter ?? false,
      decision: g.decision ?? null,
    }));
}

export async function getGameBoxscore({ params }: ApiContext) {
  const box = await getBoxscore(params.gameId);
  const stats = box?.playerByGameStats;
  if (!box || !stats) throw gameNotFound();
  const body = {
    gameId: params.gameId,
    homeTeamCode: box.homeTeam?.abbrev ?? "",
    awayTeamCode: box.awayTeam?.abbrev ?? "",
    gameState: box.gameState ?? null,
    homeSkaters: boxscoreSkaters(stats.homeTeam),
    awaySkaters: boxscoreSkaters(stats.awayTeam),
    homeGoalies: boxscoreGoalies(stats.homeTeam),
    awayGoalies: boxscoreGoalies(stats.awayTeam),
  };
  // A game in progress changes every few seconds; a final one doesn't.
  return json(body, isFinalState(box.gameState) ? CacheTier.semiStatic : CacheTier.live);
}

const isOvertime = (g: NhlClubScheduleGame) => g.periodDescriptor?.periodType === "OT" || g.periodDescriptor?.periodType === "SO";

// Season series from the home team's schedule (newest first).
export function headToHeadRecord(meetings: readonly NhlClubScheduleGame[], homeTeam: string, awayTeam: string) {
  let homeWins = 0;
  let awayWins = 0;
  let overtime = 0;
  for (const g of meetings) {
    const homeWon = (g.homeTeam?.score ?? 0) > (g.awayTeam?.score ?? 0);
    const gameHome = g.homeTeam?.abbrev;
    if ((gameHome === homeTeam && homeWon) || (gameHome === awayTeam && !homeWon)) homeWins++;
    else awayWins++;
    if (isOvertime(g)) overtime++;
  }
  return {
    season: { homeWins, awayWins, overtimeLosses: overtime },
    lastFive: meetings.slice(0, 5).map((g) => {
      const homeScore = g.homeTeam?.score ?? 0;
      const awayScore = g.awayTeam?.score ?? 0;
      return {
        date: g.gameDate ?? "",
        score: `${g.homeTeam?.abbrev ?? ""} ${homeScore} - ${g.awayTeam?.abbrev ?? ""} ${awayScore}`,
        winner: (homeScore > awayScore ? g.homeTeam?.abbrev : g.awayTeam?.abbrev) ?? "",
        overtimeType: isOvertime(g) ? (g.periodDescriptor?.periodType ?? null) : null,
      };
    }),
  };
}

type TeamSeasonRow = typeof teamSeasons.$inferSelect;

export function teamPreviewStats(
  teamCode: string,
  all: TeamSeasonRow | undefined,
  standings: NhlTeamStandings | undefined,
  specialTeams: NhlTeamSpecialTeams | undefined,
) {
  if (!all) {
    return {
      teamCode, gamesPlayed: 0, xGoalsFor: 0, xGoalsAgainst: 0, xGoalsPct: null, corsiPct: null,
      powerPlayPct: null, penaltyKillPct: null, streak: null, homeRecord: null, roadRecord: null, last10: null,
    };
  }
  const gp = all.gamesPlayed;
  const ctx = standingsContext(standings);
  return {
    teamCode,
    gamesPlayed: gp,
    xGoalsFor: gp > 0 ? round(all.xGoalsFor / gp, 2) : 0,
    xGoalsAgainst: gp > 0 ? round(all.xGoalsAgainst / gp, 2) : 0,
    xGoalsPct: all.xGoalsPercentage,
    corsiPct: all.corsiPercentage,
    powerPlayPct: specialTeams?.powerPlayPct != null ? round(specialTeams.powerPlayPct * 100, 1) : null,
    penaltyKillPct: specialTeams?.penaltyKillPct != null ? round(specialTeams.penaltyKillPct * 100, 1) : null,
    ...ctx,
  };
}

function teamSeasonAll(db: Database, team: string, season: number) {
  return db
    .select()
    .from(teamSeasons)
    .where(
      and(
        eq(teamSeasons.teamAbbreviation, team),
        eq(teamSeasons.season, season),
        eq(teamSeasons.situation, "all"),
        eq(teamSeasons.isPlayoffs, false),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);
}

// Players scoring above xG at 5v5 (min 10 GP).
function hotPlayers(db: Database, team: string, season: number, limit: number) {
  return db
    .select({ s: skaterSeasons, name: players.name, position: players.position })
    .from(skaterSeasons)
    .innerJoin(players, eq(players.id, skaterSeasons.playerId))
    .where(
      and(
        eq(skaterSeasons.team, team),
        eq(skaterSeasons.season, season),
        eq(skaterSeasons.situation, "5on5"),
        eq(skaterSeasons.isPlayoffs, false),
        gte(skaterSeasons.gamesPlayed, 10),
        isNotNull(skaterSeasons.expectedGoals),
        gt(skaterSeasons.expectedGoals, 0),
      ),
    )
    .orderBy(desc(sql`${skaterSeasons.goals} - ${skaterSeasons.expectedGoals}`), asc(skaterSeasons.id))
    .limit(limit)
    .then((rows) =>
      rows.map(({ s, name, position }) => {
        const differential = s.goals - (s.expectedGoals ?? 0);
        return {
          playerId: s.playerId,
          name,
          position,
          goals: s.goals,
          assists: s.assists,
          expectedGoals: s.expectedGoals ?? 0,
          differential: round(differential, 2),
          trend: differential > 0 ? "hot" : "cold",
        };
      }),
    );
}

function teamGoalies(db: Database, team: string, season: number) {
  return db
    .select({ g: goalieSeasons, name: players.name })
    .from(goalieSeasons)
    .innerJoin(players, eq(players.id, goalieSeasons.playerId))
    .where(
      and(
        eq(goalieSeasons.team, team),
        eq(goalieSeasons.season, season),
        eq(goalieSeasons.situation, "all"),
        eq(goalieSeasons.isPlayoffs, false),
      ),
    )
    .orderBy(desc(goalieSeasons.iceTimeSeconds), asc(goalieSeasons.id))
    .then((rows) =>
      rows.map(({ g, name }) => ({
        playerId: g.playerId,
        name,
        gamesPlayed: g.gamesPlayed,
        savePct: g.savePercentage,
        goalsAgainstAvg: g.goalsAgainstAverage,
        goalsSavedAboveExpected: g.goalsSavedAboveExpected,
      })),
    );
}

const byDateDesc = (a: NhlClubScheduleGame, b: NhlClubScheduleGame) => (b.gameDate ?? "").localeCompare(a.gameDate ?? "");

export async function getGamePreview({ db, params }: ApiContext) {
  const game = await findGameWithFallback(db, params.gameId, 1, 7);
  if (!game) throw gameNotFound();
  const { homeTeamCode: home, awayTeamCode: away, season } = game;

  const [homeSchedule, homeStats, awayStats, standings, specialTeams, homeHot, awayHot, homeGoalies, awayGoalies] =
    await Promise.all([
      getTeamSeasonGames(home, season),
      teamSeasonAll(db, home, season),
      teamSeasonAll(db, away, season),
      getStandings(),
      getTeamSpecialTeams(season),
      hotPlayers(db, home, season, 3),
      hotPlayers(db, away, season, 3),
      teamGoalies(db, home, season),
      teamGoalies(db, away, season),
    ]);

  const meetings = homeSchedule
    .filter((g) => isFinalRegularSeason(g) && (g.homeTeam?.abbrev === away || g.awayTeam?.abbrev === away))
    .sort(byDateDesc);

  return {
    game: {
      id: game.gameId,
      date: game.gameDate,
      homeTeam: home,
      homeTeamName: teamName(home),
      awayTeam: away,
      awayTeamName: teamName(away),
      startTimeUtc: game.startTimeUtc?.toISOString() ?? null,
    },
    headToHead: headToHeadRecord(meetings, home, away),
    teamComparison: {
      home: teamPreviewStats(home, homeStats, standings.get(home), specialTeams.get(home)),
      away: teamPreviewStats(away, awayStats, standings.get(away), specialTeams.get(away)),
    },
    hotPlayers: { home: homeHot, away: awayHot },
    goalieMatchup: { home: homeGoalies, away: awayGoalies },
  };
}

// Goalie totals over a team's recent games, from NHL boxscores
// ("saves/shots" in saveShotsAgainst).
export function goalieRecentForm(team: string, recentGames: readonly NhlClubScheduleGame[], boxscores: Map<string, NhlBoxscore>) {
  const totals = new Map<number, { name: string; games: number; shotsAgainst: number; goalsAgainst: number }>();
  for (const game of recentGames) {
    const box = boxscores.get(String(game.id ?? 0));
    if (!box) continue;
    const isHome = box.homeTeam?.abbrev === team;
    const goalies = (isHome ? box.playerByGameStats?.homeTeam : box.playerByGameStats?.awayTeam)?.goalies;
    if (!goalies) continue;
    for (const goalie of goalies) {
      const parts = (goalie.saveShotsAgainst ?? "").split("/");
      if (parts.length !== 2 || !/^\s*[+-]?\d+\s*$/.test(parts[1])) continue;
      const shotsFaced = Number(parts[1]);
      const id = goalie.playerId ?? 0;
      const existing = totals.get(id);
      const name = goalie.name?.default ?? "";
      totals.set(id, {
        name,
        games: (existing?.games ?? 0) + 1,
        shotsAgainst: (existing?.shotsAgainst ?? 0) + shotsFaced,
        goalsAgainst: (existing?.goalsAgainst ?? 0) + (goalie.goalsAgainst ?? 0),
      });
    }
  }
  return [...totals]
    .map(([playerId, t]) => ({
      playerId,
      name: t.name,
      gamesPlayed: t.games,
      savePct: t.shotsAgainst > 0 ? round((t.shotsAgainst - t.goalsAgainst) / t.shotsAgainst, 3) : null,
      shotsAgainst: t.shotsAgainst,
      goalsAgainst: t.goalsAgainst,
    }))
    .sort((a, b) => b.gamesPlayed - a.gamesPlayed);
}

export async function getGoalieRecentForm({ db, params }: ApiContext) {
  const game = await findGame(db, params.gameId);
  if (!game) throw gameNotFound();
  const [homeSchedule, awaySchedule] = await Promise.all([
    getTeamSeasonGames(game.homeTeamCode, game.season),
    getTeamSeasonGames(game.awayTeamCode, game.season),
  ]);
  const lastFive = (schedule: NhlClubScheduleGame[]) => schedule.filter(isFinalRegularSeason).sort(byDateDesc).slice(0, 5);
  const homeGames = lastFive(homeSchedule);
  const awayGames = lastFive(awaySchedule);

  const ids = [...new Set([...homeGames, ...awayGames].map((g) => String(g.id ?? 0)))];
  const boxes = await Promise.all(ids.map((id) => getBoxscore(id)));
  const boxscores = new Map<string, NhlBoxscore>();
  for (const box of boxes) if (box) boxscores.set(String(box.id ?? 0), box);

  return {
    home: goalieRecentForm(game.homeTeamCode, homeGames, boxscores),
    away: goalieRecentForm(game.awayTeamCode, awayGames, boxscores),
  };
}

export async function getDeserveToWin({ db, params }: ApiContext) {
  const game = await findGame(db, params.gameId);
  if (!game) throw gameNotFound();
  const rows = await db
    .select({
      gameTimeSeconds: shots.gameTimeSeconds,
      eventId: shots.eventId,
      period: shots.period,
      isHomeTeam: shots.isHomeTeam,
      xGoal: shots.xGoal,
      isGoal: shots.isGoal,
      shotOnEmptyNet: shots.shotOnEmptyNet,
      shotRebound: shots.shotRebound,
      shotGeneratedRebound: shots.shotGeneratedRebound,
    })
    .from(shots)
    .where(eq(shots.gameId, game.gameId));
  if (rows.length === 0) throw gameNotFound();
  return calculateDeserveToWin(game.gameId, game.homeTeamCode, game.awayTeamCode, rows, game.homeScore, game.awayScore);
}
