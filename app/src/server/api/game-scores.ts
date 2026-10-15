import { and, asc, countDistinct, desc, eq, inArray, max, ne, type SQL } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import { games, players, skaterGames } from "@/server/db/schema";
import type { ApiContext } from "@/server/api/handler";
import { badRequest } from "@/server/api/errors";
import { GameState } from "@/server/api/constants";
import { headshotUrl } from "@/server/api/format";
import { currentSeason } from "@/server/ingestion/normalize";

const FINAL_STATES = [GameState.final, GameState.finalAlt];
const GAME_TYPES = [GameState.regularSeason, GameState.playoffs];

// One skater's game, with the final score from the team's point of view.
const entryColumns = {
  playerId: skaterGames.playerId,
  name: skaterGames.name,
  position: skaterGames.position,
  team: skaterGames.team,
  opponent: skaterGames.opponent,
  isHome: skaterGames.isHome,
  gameId: skaterGames.gameId,
  gameDate: skaterGames.gameDate,
  isPlayoffs: skaterGames.isPlayoffs,
  toiSeconds: skaterGames.toiSeconds,
  goals: skaterGames.goals,
  primaryAssists: skaterGames.primaryAssists,
  secondaryAssists: skaterGames.secondaryAssists,
  shotsOnGoal: skaterGames.shotsOnGoal,
  gameScore: skaterGames.gameScore,
  gameScoreScoring: skaterGames.gameScoreScoring,
  gameScoreOnIce: skaterGames.gameScoreOnIce,
  gameScoreOther: skaterGames.gameScoreOther,
  storedHeadshot: players.headshotUrl,
  homeScore: games.homeScore,
  awayScore: games.awayScore,
  periodType: games.periodType,
};

function selectEntries(db: Database, where: SQL | undefined, order: "best" | "worst", limit: number) {
  return db
    .select(entryColumns)
    .from(skaterGames)
    .leftJoin(players, eq(players.id, skaterGames.playerId))
    .leftJoin(games, eq(games.gameId, skaterGames.gameId))
    .where(where)
    .orderBy(order === "best" ? desc(skaterGames.gameScore) : asc(skaterGames.gameScore), asc(skaterGames.id))
    .limit(limit);
}

function toEntry(r: Awaited<ReturnType<typeof selectEntries>>[number]) {
  const assists = r.primaryAssists + r.secondaryAssists;
  const hasScore = r.homeScore != null && r.awayScore != null;
  return {
    playerId: r.playerId,
    name: r.name,
    position: r.position,
    team: r.team,
    opponent: r.opponent,
    isHome: r.isHome,
    gameId: r.gameId,
    gameDate: r.gameDate,
    isPlayoffs: r.isPlayoffs,
    toiSeconds: r.toiSeconds,
    goals: r.goals,
    assists,
    points: r.goals + assists,
    shotsOnGoal: r.shotsOnGoal,
    gameScore: r.gameScore,
    gameScoreScoring: r.gameScoreScoring,
    gameScoreOnIce: r.gameScoreOnIce,
    gameScoreOther: r.gameScoreOther,
    teamScore: hasScore ? (r.isHome ? r.homeScore : r.awayScore) : null,
    opponentScore: hasScore ? (r.isHome ? r.awayScore : r.homeScore) : null,
    periodType: r.periodType,
    headshotUrl: headshotUrl(r.playerId, r.storedHeadshot, r.team),
  };
}

async function entries(db: Database, where: SQL | undefined, order: "best" | "worst", limit: number) {
  return (await selectEntries(db, where, order, limit)).map(toEntry);
}

function positionFilter(raw: string | undefined): SQL | undefined {
  const p = raw?.toUpperCase();
  if (!p || p === "ALL") return undefined;
  if (p === "F") return ne(skaterGames.position, "D");
  if (p === "D") return eq(skaterGames.position, "D");
  badRequest(`Invalid position '${raw}'. Use F, D or all.`);
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The best five and worst three Game Scores on one night (default: the latest
 * night with stored games), plus how many of that night's final games have
 * Game Scores (the NHL sometimes publishes no shift data).
 */
export async function getNightlyGameScores({ db, query }: ApiContext) {
  const requested = query.string("date");
  if (requested !== undefined && !DATE.test(requested)) badRequest("date must be YYYY-MM-DD");
  const date = requested ?? (await db.select({ value: max(skaterGames.gameDate) }).from(skaterGames))[0]?.value ?? null;
  if (!date) return { date: null, gamesWithScores: 0, gamesFinal: 0, best: [], worst: [] };

  const onDate = eq(skaterGames.gameDate, date);
  const [best, worst, [covered], [final]] = await Promise.all([
    entries(db, onDate, "best", 5),
    entries(db, onDate, "worst", 3),
    db.select({ n: countDistinct(skaterGames.gameId) }).from(skaterGames).where(onDate),
    db
      .select({ n: countDistinct(games.gameId) })
      .from(games)
      .where(and(eq(games.gameDate, date), inArray(games.gameState, FINAL_STATES), inArray(games.gameType, GAME_TYPES))),
  ]);
  return { date, gamesWithScores: covered.n, gamesFinal: final.n, best, worst };
}

/** The season's best and worst single-game Game Scores. */
export async function getSingleGameRecords({ db, query }: ApiContext) {
  const season = query.int("season") ?? currentSeason();
  const playoffs = query.bool("playoffs") === true;
  const limit = Math.min(25, Math.max(1, query.int("limit") ?? 10));
  const where = and(
    eq(skaterGames.season, season),
    eq(skaterGames.isPlayoffs, playoffs),
    positionFilter(query.string("position")),
  );
  const [best, worst, [covered], [final]] = await Promise.all([
    entries(db, where, "best", limit),
    entries(db, where, "worst", limit),
    db
      .select({ n: countDistinct(skaterGames.gameId) })
      .from(skaterGames)
      .where(and(eq(skaterGames.season, season), eq(skaterGames.isPlayoffs, playoffs))),
    db
      .select({ n: countDistinct(games.gameId) })
      .from(games)
      .where(
        and(
          eq(games.season, season),
          eq(games.gameType, playoffs ? GameState.playoffs : GameState.regularSeason),
          inArray(games.gameState, FINAL_STATES),
        ),
      ),
  ]);
  return { season, playoffs, gamesWithScores: covered.n, gamesFinal: final.n, best, worst };
}

export interface PlayerGameScore {
  gameId: string;
  gameScore: number;
  scoring: number;
  onIce: number;
  other: number;
}

/** Game Scores for one player and season, keyed by game, for the game log. */
export async function playerGameScores(db: Database, playerId: number, season: number): Promise<Map<string, PlayerGameScore>> {
  const rows = await db
    .select({
      gameId: skaterGames.gameId,
      gameScore: skaterGames.gameScore,
      scoring: skaterGames.gameScoreScoring,
      onIce: skaterGames.gameScoreOnIce,
      other: skaterGames.gameScoreOther,
    })
    .from(skaterGames)
    .where(and(eq(skaterGames.playerId, playerId), eq(skaterGames.season, season)));
  return new Map(rows.map((r) => [r.gameId, r]));
}
