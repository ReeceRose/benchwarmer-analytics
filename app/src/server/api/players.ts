import { and, asc, desc, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import { chemistryPairs, games, goalieSeasons, players, shots, skaterSeasonAdvanced, skaterSeasons } from "@/server/db/schema";
import type { ApiContext } from "@/server/api/handler";
import { ApiError, badRequest, HttpError, notFound } from "@/server/api/errors";
import { addDays, dayNumber, groupBy, headshotUrl, MIN_DATE, round, sum, todayUtc } from "@/server/api/format";
import { intRouteParam } from "@/server/api/query";
import { gameResult, pairPercentage, parsePagination } from "@/server/api/teams";
import { getPlayerGameLog as fetchNhlGameLog, type NhlPlayerGameLogEntry } from "@/server/api/nhl-client";
import { isFinalState } from "@/server/api/constants";
import { playerDraft } from "@/server/api/history";
import { playerAwards } from "@/server/api/trophies";
import { playerRecords } from "@/server/api/records";
import { shotColumns, shotSummary, toShotDto } from "@/server/api/shots";
import { playerGameScores, type PlayerGameScore } from "@/server/api/game-scores";
import type { GoalieGameLogEntry, SkaterGameLogEntry } from "@/types";
import { currentSeason, seasonForDate } from "@/server/ingestion/normalize";
import { playerInjury, playerTransactions } from "@/server/api/injuries";

type PlayerRow = typeof players.$inferSelect;
type SkaterSeasonRow = typeof skaterSeasons.$inferSelect;
type GoalieSeasonRow = typeof goalieSeasons.$inferSelect;
type AdvancedRow = typeof skaterSeasonAdvanced.$inferSelect;

export async function findPlayer(db: Database, id: number): Promise<PlayerRow | undefined> {
  const [player] = await db.select().from(players).where(eq(players.id, id)).limit(1);
  return player;
}

// Integer `{id}` route param: anything else is a 404.
export async function requirePlayer(db: Database, rawId: string | undefined): Promise<PlayerRow> {
  const id = intRouteParam(rawId);
  if (id === undefined) throw new HttpError(404, { error: "Not found", code: "NOT_FOUND" });
  return (await findPlayer(db, id)) ?? notFound(ApiError.playerNotFound);
}

export async function searchPlayers({ db, query }: ApiContext) {
  const q = query.string("q");
  if (!q?.trim()) badRequest(ApiError.missingQuery);
  const paging = parsePagination(query.int("page"), query.int("pageSize"));

  // Case-insensitive substring match with strpos, so % and _ are literal.
  const needle = q.toLowerCase();
  const where = or(
    sql`strpos(lower(${players.name}), ${needle}) > 0`,
    sql`strpos(lower(${players.firstName}), ${needle}) > 0`,
    sql`strpos(lower(${players.lastName}), ${needle}) > 0`,
  );
  const [[{ count }], rows] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(players).where(where),
    db
      .select({
        id: players.id,
        name: players.name,
        position: players.position,
        currentTeamAbbreviation: players.currentTeamAbbreviation,
      })
      .from(players)
      .where(where)
      .orderBy(asc(players.name), asc(players.id))
      .limit(paging?.pageSize ?? 50)
      .offset(paging ? (paging.page - 1) * paging.pageSize : 0),
  ]);

  return {
    players: rows,
    totalCount: count,
    page: paging?.page ?? null,
    pageSize: paging?.pageSize ?? null,
    totalPages: paging ? Math.ceil(count / paging.pageSize) : null,
  };
}

export function toPlayerDetail(p: PlayerRow) {
  return {
    id: p.id,
    name: p.name,
    firstName: p.firstName,
    lastName: p.lastName,
    position: p.position,
    currentTeamAbbreviation: p.currentTeamAbbreviation,
    headshotUrl: headshotUrl(p.id, p.headshotUrl, p.currentTeamAbbreviation),
    birthDate: p.birthDate,
    heightInches: p.heightInches,
    weightLbs: p.weightLbs,
    shoots: p.shoots,
  };
}

export async function getPlayer({ db, params }: ApiContext) {
  const player = await requirePlayer(db, params.id);
  const [draft, awards, records, injury, transactions] = await Promise.all([
    playerDraft(db, player.id),
    playerAwards(db, player.id),
    playerRecords(db, player.id),
    playerInjury(db, player.id),
    playerTransactions(db, player.id),
  ]);
  return { ...toPlayerDetail(player), draft, awards, ...records, injury, transactions };
}

// Skater/goalie season rows for a player, newest first (Get*ByPlayerAsync).
export function skaterSeasonsForPlayer(db: Database, playerId: number, season?: number, situation?: string) {
  return db
    .select()
    .from(skaterSeasons)
    .where(
      and(
        eq(skaterSeasons.playerId, playerId),
        season === undefined ? undefined : eq(skaterSeasons.season, season),
        situation ? eq(skaterSeasons.situation, situation) : undefined,
      ),
    )
    .orderBy(desc(skaterSeasons.season), asc(skaterSeasons.situation), asc(skaterSeasons.id));
}

export function goalieSeasonsForPlayer(db: Database, playerId: number, season?: number, situation?: string) {
  return db
    .select()
    .from(goalieSeasons)
    .where(
      and(
        eq(goalieSeasons.playerId, playerId),
        season === undefined ? undefined : eq(goalieSeasons.season, season),
        situation ? eq(goalieSeasons.situation, situation) : undefined,
      ),
    )
    .orderBy(desc(goalieSeasons.season), asc(goalieSeasons.situation), asc(goalieSeasons.id));
}

export function toGoalieStatsDto(g: GoalieSeasonRow) {
  return {
    id: g.id,
    playerId: g.playerId,
    season: g.season,
    team: g.team,
    situation: g.situation,
    isPlayoffs: g.isPlayoffs,
    gamesPlayed: g.gamesPlayed,
    iceTimeSeconds: g.iceTimeSeconds,
    goalsAgainst: g.goalsAgainst,
    shotsAgainst: g.shotsAgainst,
    savePercentage: g.savePercentage,
    goalsAgainstAverage: g.goalsAgainstAverage,
    goalsSavedAboveExpected: g.goalsSavedAboveExpected,
    expectedGoalsAgainst: g.expectedGoalsAgainst,
    lowDangerShots: g.lowDangerShots,
    mediumDangerShots: g.mediumDangerShots,
    highDangerShots: g.highDangerShots,
    lowDangerGoals: g.lowDangerGoals,
    mediumDangerGoals: g.mediumDangerGoals,
    highDangerGoals: g.highDangerGoals,
    expectedRebounds: g.expectedRebounds,
    rebounds: g.rebounds,
  };
}

// Derived shift/faceoff/giveaway rates from the advanced row (1 dp).
export function advancedRates(adv: AdvancedRow | undefined) {
  let oZoneShiftPct: number | null = null;
  let dZoneShiftPct: number | null = null;
  if (adv && adv.ifoZoneShiftStarts !== null && adv.ifdZoneShiftStarts !== null && adv.ifNeutralZoneShiftStarts !== null) {
    const total = adv.ifoZoneShiftStarts + adv.ifdZoneShiftStarts + adv.ifNeutralZoneShiftStarts;
    if (total > 0) {
      oZoneShiftPct = round((adv.ifoZoneShiftStarts / total) * 100, 1);
      dZoneShiftPct = round((adv.ifdZoneShiftStarts / total) * 100, 1);
    }
  }
  let faceoffPct: number | null = null;
  if (adv && adv.faceoffsWon !== null && adv.faceoffsLost !== null) {
    const total = adv.faceoffsWon + adv.faceoffsLost;
    if (total > 0) faceoffPct = round((adv.faceoffsWon / total) * 100, 1);
  }
  let giveawayDZonePct: number | null = null;
  if (adv && adv.ifGiveaways !== null && adv.ifGiveaways > 0 && adv.ifdZoneGiveaways !== null) {
    giveawayDZonePct = round((adv.ifdZoneGiveaways / adv.ifGiveaways) * 100, 1);
  }
  return { oZoneShiftPct, dZoneShiftPct, faceoffPct, giveawayDZonePct };
}

export function toSkaterStatsDto(s: SkaterSeasonRow, adv?: AdvancedRow | null) {
  const base = {
    id: s.id,
    playerId: s.playerId,
    season: s.season,
    team: s.team,
    situation: s.situation,
    isPlayoffs: s.isPlayoffs,
    gamesPlayed: s.gamesPlayed,
    iceTimeSeconds: s.iceTimeSeconds,
    goals: s.goals,
    assists: s.assists,
    points: s.goals + s.assists,
    shots: s.shots,
    expectedGoals: s.expectedGoals,
    expectedGoalsPer60: s.expectedGoalsPer60,
    onIceShootingPct: s.onIceShootingPct,
    onIceSavePct: s.onIceSavePct,
    corsiForPct: s.corsiForPct,
    fenwickForPct: s.fenwickForPct,
  };
  // adv is null for the comparison endpoint, which leaves every advanced field null.
  const a = adv ?? undefined;
  const rates = advancedRates(a);
  return {
    ...base,
    shifts: a?.shifts ?? null,
    oZoneShiftStarts: a?.ifoZoneShiftStarts ?? null,
    dZoneShiftStarts: a?.ifdZoneShiftStarts ?? null,
    nZoneShiftStarts: a?.ifNeutralZoneShiftStarts ?? null,
    oZoneShiftPct: rates.oZoneShiftPct,
    dZoneShiftPct: rates.dZoneShiftPct,
    faceoffsWon: a?.faceoffsWon ?? null,
    faceoffsLost: a?.faceoffsLost ?? null,
    faceoffPct: rates.faceoffPct,
    takeaways: a?.ifTakeaways ?? null,
    giveaways: a?.ifGiveaways ?? null,
    dZoneGiveaways: a?.ifdZoneGiveaways ?? null,
    giveawayDZonePct: rates.giveawayDZonePct,
    // Season total. Only the "all" row is meaningful (see docs/INGESTION_NOTES.md).
    gameScore: s.situation === "all" ? (a?.gameScore ?? null) : null,
  };
}

export async function getPlayerStats({ db, params, query }: ApiContext) {
  const player = await requirePlayer(db, params.id);
  const season = query.int("season");
  const situation = query.string("situation");

  if (player.position === "G") {
    const rows = await goalieSeasonsForPlayer(db, player.id, season, situation);
    return { playerId: player.id, playerName: player.name, stats: rows.map(toGoalieStatsDto) };
  }

  const [rows, advanced] = await Promise.all([
    skaterSeasonsForPlayer(db, player.id, season, situation),
    db
      .select()
      .from(skaterSeasonAdvanced)
      .where(
        and(
          eq(skaterSeasonAdvanced.playerId, player.id),
          season === undefined ? undefined : eq(skaterSeasonAdvanced.season, season),
          situation ? eq(skaterSeasonAdvanced.situation, situation) : undefined,
        ),
      ),
  ]);
  const key = (r: { season: number; team: string; situation: string; isPlayoffs: boolean }) =>
    `${r.season}|${r.team}|${r.situation}|${r.isPlayoffs}`;
  const advancedByKey = new Map(advanced.map((a) => [key(a), a]));

  return {
    playerId: player.id,
    playerName: player.name,
    stats: rows.map((s) => toSkaterStatsDto(s, advancedByKey.get(key(s)))),
  };
}

export async function getPlayerLinemates({ db, params, query }: ApiContext) {
  const player = await requirePlayer(db, params.id);
  const season = query.int("season") ?? currentSeason();
  const situation = query.string("situation");

  const rows = await db
    .select()
    .from(chemistryPairs)
    .where(
      and(
        eq(chemistryPairs.season, season),
        or(eq(chemistryPairs.player1Id, player.id), eq(chemistryPairs.player2Id, player.id)),
        situation ? eq(chemistryPairs.situation, situation) : undefined,
      ),
    )
    .orderBy(desc(chemistryPairs.totalIceTimeSeconds), asc(chemistryPairs.player1Id), asc(chemistryPairs.player2Id));

  return {
    playerId: player.id,
    playerName: player.name,
    linemates: rows.map((c) => {
      const isPlayer1 = c.player1Id === player.id;
      return {
        playerId: isPlayer1 ? c.player2Id : c.player1Id,
        playerName: isPlayer1 ? c.player2Name : c.player1Name,
        totalIceTimeSeconds: c.totalIceTimeSeconds,
        gamesPlayed: c.gamesPlayed,
        goalsFor: c.goalsFor,
        goalsAgainst: c.goalsAgainst,
        expectedGoalsPct: pairPercentage(c.xGoalsFor, c.xGoalsAgainst),
      };
    }),
  };
}

export async function getPlayerShots({ db, params, query }: ApiContext) {
  const player = await requirePlayer(db, params.id);
  const season = query.int("season");
  const period = query.int("period");
  // Matched as given (no upper-casing or validation).
  const shotType = query.string("shotType");
  const goalsOnly = query.bool("goalsOnly") === true;
  const limit = query.int("limit");

  const shotsQuery = db
    .select(shotColumns)
    .from(shots)
    .where(
      and(
        eq(shots.shooterPlayerId, player.id),
        season === undefined ? undefined : eq(shots.season, season),
        period === undefined ? undefined : eq(shots.period, period),
        shotType ? eq(shots.shotType, shotType) : undefined,
        goalsOnly ? eq(shots.isGoal, true) : undefined,
      ),
    )
    .orderBy(desc(shots.season), asc(shots.gameId), asc(shots.gameTimeSeconds), asc(shots.eventId))
    .$dynamic();
  if (limit !== undefined) shotsQuery.limit(Math.max(limit, 0));
  const rows = await shotsQuery;

  return {
    playerId: player.id,
    playerName: player.name,
    season: season ?? null,
    shots: rows.map(toShotDto),
    summary: shotSummary(rows),
  };
}

// Game IDs (YYYYTTNNNN) sort chronologically, so the most recent N games are
// the N largest IDs.
async function recentGameIds(db: Database, where: SQL | undefined, limit: number): Promise<string[]> {
  const rows = await db
    .selectDistinct({ gameId: shots.gameId })
    .from(shots)
    .where(where)
    .orderBy(desc(shots.gameId))
    .limit(limit);
  return rows.map((r) => r.gameId);
}

export interface RollingGame {
  gameId: string;
  goals: number;
  shots: number;
  expectedGoals: number;
  shootingPct: number;
}

// Rolling form vs season averages. "hot"/"cold" when recent goals per game is
// more than 20% above/below the season rate.
export function rollingSummary(
  gamesList: readonly RollingGame[],
  seasonStat: Pick<SkaterSeasonRow, "gamesPlayed" | "goals" | "shots" | "expectedGoals"> | undefined,
) {
  const n = gamesList.length;
  const goals = sum(gamesList, (g) => g.goals);
  const shotCount = sum(gamesList, (g) => g.shots);
  const xg = sum(gamesList, (g) => g.expectedGoals);
  const rollingGoalsPerGame = n > 0 ? round(goals / n, 2) : 0;

  let seasonGoalsPerGame = 0;
  let seasonShotsPerGame = 0;
  let seasonXgPerGame = 0;
  let seasonShootingPct = 0;
  if (seasonStat && seasonStat.gamesPlayed > 0) {
    seasonGoalsPerGame = round(seasonStat.goals / seasonStat.gamesPlayed, 2);
    seasonShotsPerGame = round(seasonStat.shots / seasonStat.gamesPlayed, 2);
    seasonXgPerGame = seasonStat.expectedGoals !== null ? round(seasonStat.expectedGoals / seasonStat.gamesPlayed, 2) : 0;
    seasonShootingPct = seasonStat.shots > 0 ? round((seasonStat.goals / seasonStat.shots) * 100, 1) : 0;
  }

  let trend = "neutral";
  if (seasonGoalsPerGame > 0) {
    const ratio = rollingGoalsPerGame / seasonGoalsPerGame;
    if (ratio > 1.2) trend = "hot";
    else if (ratio < 0.8) trend = "cold";
  }

  return {
    seasonGoalsPerGame,
    seasonShotsPerGame,
    seasonXgPerGame,
    seasonShootingPct,
    rollingGoalsPerGame,
    rollingShotsPerGame: n > 0 ? round(shotCount / n, 2) : 0,
    rollingXgPerGame: n > 0 ? round(xg / n, 2) : 0,
    rollingShootingPct: shotCount > 0 ? round((goals / shotCount) * 100, 1) : 0,
    trend,
  };
}

export async function getPlayerRollingStats({ db, params, query }: ApiContext) {
  const player = await requirePlayer(db, params.id);
  const season = query.int("season") ?? currentSeason();
  const gameLimit = Math.min(Math.max(query.int("games") ?? 20, 1), 50);

  const gameIds = await recentGameIds(
    db,
    and(eq(shots.shooterPlayerId, player.id), eq(shots.season, season), eq(shots.isPlayoffGame, false)),
    gameLimit,
  );
  if (gameIds.length === 0) {
    return {
      playerId: player.id, playerName: player.name, season, gamesIncluded: 0, games: [],
      ...rollingSummary([], undefined),
    };
  }

  const [perGame, seasonRows] = await Promise.all([
    db
      .select({
        gameId: shots.gameId,
        goals: sql<number>`count(*) filter (where ${shots.isGoal})::int`,
        shots: sql<number>`count(*)::int`,
        xGoals: sql<string>`coalesce(sum(coalesce(${shots.xGoal}, 0)), 0)`,
      })
      .from(shots)
      .where(and(eq(shots.shooterPlayerId, player.id), inArray(shots.gameId, gameIds)))
      .groupBy(shots.gameId)
      .orderBy(desc(shots.gameId)),
    skaterSeasonsForPlayer(db, player.id, season, "all"),
  ]);

  const gamesList: RollingGame[] = perGame.map((g) => ({
    gameId: g.gameId,
    goals: g.goals,
    shots: g.shots,
    expectedGoals: round(Number(g.xGoals), 2),
    shootingPct: g.shots > 0 ? round((g.goals / g.shots) * 100, 1) : 0,
  }));

  return {
    playerId: player.id,
    playerName: player.name,
    season,
    gamesIncluded: gamesList.length,
    games: gamesList,
    ...rollingSummary(gamesList, seasonRows.find((s) => !s.isPlayoffs)),
  };
}

export interface GoalieGame {
  gameId: string;
  gameDate: string;
  opponent: string;
  isHome: boolean;
  shotsAgainst: number;
  goalsAgainst: number;
  savePercentage: number;
  expectedGoalsAgainst: number;
  goalsSavedAboveExpected: number;
  isBackToBack: boolean;
  daysSincePreviousGame: number | null;
}

export interface GoalieShot {
  gameId: string;
  isGoal: boolean;
  shotWasOnGoal: boolean;
  xGoal: number | null;
  isHomeTeam: boolean;
  homeTeamCode: string;
  awayTeamCode: string;
}

// Shots on goal faced per game, newest game date first. Unknown dates use
// MIN_DATE and sort last.
export function goaliePerGameStats(shotRows: readonly GoalieShot[], gameDates: Map<string, string>): GoalieGame[] {
  const result: GoalieGame[] = [];
  for (const [gameId, rows] of groupBy(shotRows, (s) => s.gameId)) {
    const onGoal = rows.filter((s) => s.shotWasOnGoal);
    const shotsAgainst = onGoal.length;
    const goalsAgainst = onGoal.filter((s) => s.isGoal).length;
    const xga = sum(onGoal, (s) => s.xGoal);
    // The goalie defends against the shooting team.
    const goalieIsHome = !rows[0].isHomeTeam;
    result.push({
      gameId,
      gameDate: gameDates.get(gameId) ?? MIN_DATE,
      opponent: goalieIsHome ? rows[0].awayTeamCode : rows[0].homeTeamCode,
      isHome: goalieIsHome,
      shotsAgainst,
      goalsAgainst,
      savePercentage: shotsAgainst > 0 ? round((shotsAgainst - goalsAgainst) / shotsAgainst, 4) : 0,
      expectedGoalsAgainst: round(xga, 2),
      goalsSavedAboveExpected: round(xga - goalsAgainst, 2),
      isBackToBack: false,
      daysSincePreviousGame: null,
    });
  }
  return result.sort((a, b) => (a.gameDate < b.gameDate ? 1 : a.gameDate > b.gameDate ? -1 : 0));
}

// Days since the next-older game; back-to-back when exactly 1.
export function markBackToBacks(gamesList: GoalieGame[]): void {
  for (let i = 0; i < gamesList.length - 1; i++) {
    const diff = dayNumber(gamesList[i].gameDate) - dayNumber(gamesList[i + 1].gameDate);
    gamesList[i] = { ...gamesList[i], isBackToBack: diff === 1, daysSincePreviousGame: diff };
  }
}

export function emptyWorkloadWindow(days: number) {
  return {
    days, gamesPlayed: 0, gamesPerWeek: 0, totalShotsAgainst: 0, avgShotsAgainstPerGame: 0,
    avgSavePercentage: 0, totalGSAx: 0, isHighWorkload: false,
  };
}

export function workloadWindow(gamesList: readonly GoalieGame[], referenceDate: string, days: number) {
  const cutoff = addDays(referenceDate, -days);
  const window = gamesList.filter((g) => g.gameDate !== MIN_DATE && g.gameDate >= cutoff && g.gameDate <= referenceDate);
  if (window.length === 0) return emptyWorkloadWindow(days);
  const totalSA = sum(window, (g) => g.shotsAgainst);
  const totalGA = sum(window, (g) => g.goalsAgainst);
  const gamesPerWeek = round((window.length / days) * 7, 2);
  const avgSA = round(totalSA / window.length, 1);
  return {
    days,
    gamesPlayed: window.length,
    gamesPerWeek,
    totalShotsAgainst: totalSA,
    avgShotsAgainstPerGame: avgSA,
    avgSavePercentage: totalSA > 0 ? round((totalSA - totalGA) / totalSA, 4) : 0,
    totalGSAx: round(sum(window, (g) => g.goalsSavedAboveExpected), 2),
    isHighWorkload: gamesPerWeek > 4 || avgSA > 30,
  };
}

function avgSavePct(gamesList: readonly GoalieGame[]): number {
  const totalSA = sum(gamesList, (g) => g.shotsAgainst);
  const totalGA = sum(gamesList, (g) => g.goalsAgainst);
  return totalSA > 0 ? round((totalSA - totalGA) / totalSA, 4) : 0;
}

// "GAA" here is goals against per game.
function goalsPerGame(gamesList: readonly GoalieGame[]): number {
  return gamesList.length > 0 ? round(sum(gamesList, (g) => g.goalsAgainst) / gamesList.length, 2) : 0;
}

export function backToBackSplits(gamesList: readonly GoalieGame[]) {
  const b2b = gamesList.filter((g) => g.isBackToBack);
  const rest = gamesList.filter((g) => !g.isBackToBack);
  return {
    backToBackGames: b2b.length,
    nonBackToBackGames: rest.length,
    backToBackSavePercentage: avgSavePct(b2b),
    nonBackToBackSavePercentage: avgSavePct(rest),
    backToBackGAA: goalsPerGame(b2b),
    nonBackToBackGAA: goalsPerGame(rest),
    backToBackGSAx: round(sum(b2b, (g) => g.goalsSavedAboveExpected), 2),
    nonBackToBackGSAx: round(sum(rest, (g) => g.goalsSavedAboveExpected), 2),
  };
}

export function workloadTrend(last7Days: { gamesPerWeek: number; avgShotsAgainstPerGame: number }): string {
  if (last7Days.gamesPerWeek >= 3 && last7Days.avgShotsAgainstPerGame > 30) return "heavy";
  if (last7Days.gamesPerWeek >= 3) return "moderate";
  return "light";
}

// Fallback for games missing from the schedule: spread game numbers 1-1312
// over Oct 1 - Apr 15 of the season.
export function estimateGameDate(gameId: string, season: number): string | undefined {
  let gameNumber: number | undefined;
  if (gameId.length >= 10 && /^\d+$/.test(gameId.slice(6))) gameNumber = Number(gameId.slice(6));
  else if (/^[+-]?\d+$/.test(gameId)) gameNumber = Number(gameId) % 10000;
  if (gameNumber === undefined) return undefined;
  return addDays(`${season}-10-01`, Math.trunc((gameNumber / 1312) * 197));
}

// The current season's windows end today, so a goalie who has stopped playing
// shows empty windows; a past season's end at its last game, so it still shows
// the final stretch.
export function workloadReferenceDate(gamesList: readonly GoalieGame[], season: number, today: string): string {
  if (season >= seasonForDate(new Date(`${today}T00:00:00Z`))) return today;
  const latest = gamesList.find((g) => g.gameDate !== MIN_DATE);
  return latest?.gameDate ?? today;
}

export async function getGoalieWorkload({ db, params, query }: ApiContext) {
  const player = await requirePlayer(db, params.id);
  if (player.position !== "G") badRequest({ error: "Player is not a goalie" });
  const season = query.int("season") ?? currentSeason();
  const gameLimit = Math.min(Math.max(query.int("games") ?? 30, 1), 50);

  const faced = and(eq(shots.goaliePlayerId, player.id), eq(shots.shotOnEmptyNet, false));
  const gameIds = await recentGameIds(db, and(faced, eq(shots.season, season), eq(shots.isPlayoffGame, false)), gameLimit);
  if (gameIds.length === 0) {
    return {
      playerId: player.id, playerName: player.name, season, gamesIncluded: 0, games: [],
      windowEnd: todayUtc(), lastGameDate: null,
      last7Days: emptyWorkloadWindow(7), last14Days: emptyWorkloadWindow(14), last30Days: emptyWorkloadWindow(30),
      backToBackSplits: backToBackSplits([]), workloadTrend: "light",
    };
  }

  const [shotRows, gameRows] = await Promise.all([
    db
      .select({
        gameId: shots.gameId,
        isGoal: shots.isGoal,
        shotWasOnGoal: shots.shotWasOnGoal,
        xGoal: shots.xGoal,
        isHomeTeam: shots.isHomeTeam,
        homeTeamCode: shots.homeTeamCode,
        awayTeamCode: shots.awayTeamCode,
      })
      .from(shots)
      .where(and(faced, inArray(shots.gameId, gameIds)))
      .orderBy(desc(shots.gameId), asc(shots.period), asc(shots.gameTimeSeconds), asc(shots.eventId)),
    db.select({ gameId: games.gameId, gameDate: games.gameDate }).from(games).where(inArray(games.gameId, gameIds)),
  ]);

  const gameDates = new Map(gameRows.map((g) => [g.gameId, g.gameDate]));
  for (const gameId of gameIds) {
    if (gameDates.has(gameId)) continue;
    const estimated = estimateGameDate(gameId, season);
    if (estimated) gameDates.set(gameId, estimated);
  }

  const gamesList = goaliePerGameStats(shotRows, gameDates);
  markBackToBacks(gamesList);
  const referenceDate = workloadReferenceDate(gamesList, season, todayUtc());
  const last7Days = workloadWindow(gamesList, referenceDate, 7);

  return {
    playerId: player.id,
    playerName: player.name,
    season,
    gamesIncluded: gamesList.length,
    games: gamesList,
    windowEnd: referenceDate,
    lastGameDate: gamesList.find((g) => g.gameDate !== MIN_DATE)?.gameDate ?? null,
    last7Days,
    last14Days: workloadWindow(gamesList, referenceDate, 14),
    last30Days: workloadWindow(gamesList, referenceDate, 30),
    backToBackSplits: backToBackSplits(gamesList),
    workloadTrend: workloadTrend(last7Days),
  };
}

// Picks the stats row to compare: latest regular season (skaters prefer rows
// that have xG), else the first row.
export function latestSkaterStat(rows: readonly SkaterSeasonRow[]): SkaterSeasonRow | undefined {
  const regular = rows
    .filter((s) => !s.isPlayoffs)
    .sort((a, b) => Number(b.expectedGoals !== null) - Number(a.expectedGoals !== null) || b.season - a.season);
  return regular[0] ?? rows[0];
}

export function latestGoalieStat(rows: readonly GoalieSeasonRow[]): GoalieSeasonRow | undefined {
  const regular = rows.filter((s) => !s.isPlayoffs).sort((a, b) => b.season - a.season);
  return regular[0] ?? rows[0];
}

export async function comparePlayers({ db, query }: ApiContext) {
  const ids = query.string("ids");
  if (ids === undefined) badRequest(ApiError.invalidParameter("ids"));
  const season = query.int("season");
  const situation = query.string("situation");

  // Unparseable entries are skipped.
  const playerIds = ids
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[+-]?\d+$/.test(s))
    .map(Number);
  if (playerIds.length < 2) badRequest(ApiError.insufficientPlayers);
  if (playerIds.length > 5) badRequest(ApiError.tooManyPlayers);

  const found = await db.select().from(players).where(inArray(players.id, playerIds));
  const byId = new Map(found.map((p) => [p.id, p]));
  const list = playerIds.map((id) => byId.get(id)).filter((p): p is PlayerRow => p !== undefined);
  if (list.length < 2) badRequest(ApiError.insufficientPlayers);

  const comparisons = await Promise.all(
    list.map(async (player) => {
      const base = {
        playerId: player.id,
        name: player.name,
        position: player.position,
        team: player.currentTeamAbbreviation,
      };
      if (player.position === "G") {
        const stat = latestGoalieStat(await goalieSeasonsForPlayer(db, player.id, season, situation ?? "all"));
        return { ...base, stats: null, goalieStats: stat ? toGoalieStatsDto(stat) : null };
      }
      const stat = latestSkaterStat(await skaterSeasonsForPlayer(db, player.id, season, situation ?? "all"));
      return { ...base, stats: stat ? toSkaterStatsDto(stat, null) : null, goalieStats: null };
    }),
  );

  return { season: season ?? null, situation: situation ?? "all", players: comparisons };
}

// "MM:SS" → seconds (0 when missing or malformed).
export function toiSeconds(toi: string | undefined): number {
  const match = /^(\d+):(\d{2})$/.exec(toi ?? "");
  return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
}

export interface GameScore {
  homeTeamCode: string;
  homeScore: number;
  awayScore: number;
  periodType: string | null;
  gameState: string;
}

// Our expected goals for one game: the player's xG (skaters) or xG against
// (goalies). Absent when the game has no shots stored yet.
export type GameXg = Map<string, number>;

interface GameLogContext {
  scores: ReadonlyMap<string, GameScore>;
  xg: GameXg;
}

// Fields every game log entry shares: opponent, venue and our final score.
function baseGameLogEntry(entry: NhlPlayerGameLogEntry, gameId: string, scores: ReadonlyMap<string, GameScore>) {
  const isHome = entry.homeRoadFlag === "H";
  const score = scores.get(gameId);
  const final = score && isFinalState(score.gameState) ? score : undefined;
  const teamScore = final ? (isHome ? final.homeScore : final.awayScore) : null;
  const opponentScore = final ? (isHome ? final.awayScore : final.homeScore) : null;
  return {
    gameId,
    gameDate: entry.gameDate!,
    team: entry.teamAbbrev ?? "",
    opponent: entry.opponentAbbrev ?? "",
    isHome,
    teamScore,
    opponentScore,
    periodType: final?.periodType ?? null,
    result: final && teamScore !== null && opponentScore !== null ? gameResult(teamScore, opponentScore, final.periodType) : null,
    toiSeconds: toiSeconds(entry.toi),
  };
}

// NHL game logs come newest first; entries are returned oldest first.
function oldestFirst(log: readonly NhlPlayerGameLogEntry[]) {
  return [...log].reverse().filter((e) => e.gameId !== undefined && Boolean(e.gameDate));
}

export function buildSkaterGameLog(
  log: readonly NhlPlayerGameLogEntry[],
  { scores, xg }: GameLogContext,
  gameScores: ReadonlyMap<string, PlayerGameScore> = new Map(),
): SkaterGameLogEntry[] {
  return oldestFirst(log).map((entry) => {
    const gameId = String(entry.gameId);
    const gameXg = xg.get(gameId);
    const gameScore = gameScores.get(gameId);
    return {
      ...baseGameLogEntry(entry, gameId, scores),
      goals: entry.goals ?? 0,
      assists: entry.assists ?? 0,
      points: entry.points ?? 0,
      plusMinus: entry.plusMinus ?? 0,
      shots: entry.shots ?? 0,
      powerPlayPoints: entry.powerPlayPoints ?? 0,
      xGoals: gameXg !== undefined ? round(gameXg, 2) : null,
      gameScore: gameScore?.gameScore ?? null,
      gameScoreScoring: gameScore?.scoring ?? null,
      gameScoreOnIce: gameScore?.onIce ?? null,
      gameScoreOther: gameScore?.other ?? null,
    };
  });
}

export function buildGoalieGameLog(log: readonly NhlPlayerGameLogEntry[], { scores, xg }: GameLogContext): GoalieGameLogEntry[] {
  return oldestFirst(log).map((entry) => {
    const gameId = String(entry.gameId);
    const gameXg = xg.get(gameId);
    const goalsAgainst = entry.goalsAgainst ?? 0;
    return {
      ...baseGameLogEntry(entry, gameId, scores),
      started: (entry.gamesStarted ?? 0) > 0,
      decision: entry.decision ?? null,
      shotsAgainst: entry.shotsAgainst ?? 0,
      goalsAgainst,
      xGoalsAgainst: gameXg !== undefined ? round(gameXg, 2) : null,
      goalsSavedAboveExpected: gameXg !== undefined ? round(gameXg - goalsAgainst, 2) : null,
    };
  });
}

// NHL game log (newest first) → oldest-first entries with our final score,
// xG and (skaters) Game Score merged in.
export function buildPlayerGameLog(
  log: readonly NhlPlayerGameLogEntry[],
  scores: ReadonlyMap<string, GameScore>,
  xg: GameXg,
  isGoalie: boolean,
  gameScores: ReadonlyMap<string, PlayerGameScore> = new Map(),
): SkaterGameLogEntry[] | GoalieGameLogEntry[] {
  const context = { scores, xg };
  return isGoalie ? buildGoalieGameLog(log, context) : buildSkaterGameLog(log, context, gameScores);
}

export async function getPlayerGameLog({ db, params, query }: ApiContext) {
  const player = await requirePlayer(db, params.id);
  const season = query.int("season") ?? currentSeason();
  const playoffs = query.bool("playoffs") ?? false;
  const isGoalie = player.position === "G";
  const meta = { playerId: player.id, season, isPlayoffs: playoffs, isGoalie };

  const log = await fetchNhlGameLog(player.id, season, playoffs);
  if (log === null) return { ...meta, available: false, games: [] };
  const gameIds = log.flatMap((g) => (g.gameId !== undefined ? [String(g.gameId)] : []));
  if (gameIds.length === 0) return { ...meta, available: true, games: [] };

  const playerColumn = isGoalie ? shots.goaliePlayerId : shots.shooterPlayerId;
  const [scoreRows, xgRows, gameScoreRows] = await Promise.all([
    db
      .select({
        gameId: games.gameId,
        homeTeamCode: games.homeTeamCode,
        homeScore: games.homeScore,
        awayScore: games.awayScore,
        periodType: games.periodType,
        gameState: games.gameState,
      })
      .from(games)
      .where(inArray(games.gameId, gameIds)),
    // Every game with stored shots gets a row, so a game with none by this
    // player reads as 0 rather than missing.
    db
      .select({
        gameId: shots.gameId,
        xg: sql<string>`coalesce(sum(${shots.xGoal}) filter (where ${playerColumn} = ${player.id}), 0)`,
      })
      .from(shots)
      .where(and(eq(shots.season, season), inArray(shots.gameId, gameIds)))
      .groupBy(shots.gameId),
    isGoalie ? new Map<string, PlayerGameScore>() : playerGameScores(db, player.id, season),
  ]);

  const scores = new Map(scoreRows.map(({ gameId, ...score }) => [gameId, score]));
  const xg: GameXg = new Map(xgRows.map((r) => [r.gameId, Number(r.xg)]));
  return { ...meta, available: true, games: buildPlayerGameLog(log, scores, xg, isGoalie, gameScoreRows) };
}
