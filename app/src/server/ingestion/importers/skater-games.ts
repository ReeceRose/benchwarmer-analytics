import { GameState } from "@/server/api/constants";
import { buildLiveGame } from "@/server/api/game-live";
import { getBoxscore, getPlayByPlay, getShiftChart } from "@/server/api/nhl-client";
import { skaterGames } from "@/server/db/schema";
import { upsert, type Queryable, type UpsertRow } from "@/server/ingestion/db";
import type { Logger } from "@/server/ingestion/sync-runs";
import type { LiveGameResponse } from "@/types";

export interface FinalGame {
  gameId: string;
  season: number;
  gameType: number;
  gameDate: string;
  homeTeamCode: string;
  awayTeamCode: string;
}

// Final regular-season and playoff games in `season` with no skater rows yet,
// newest first, so games the NHL never publishes shifts for can't hold up
// new ones.
export async function gamesMissingSkaterRows(db: Queryable, season: number, limit: number): Promise<FinalGame[]> {
  const { rows } = await db.query<FinalGame>(
    `SELECT g.game_id AS "gameId", g.season, g.game_type AS "gameType", g.game_date::text AS "gameDate",
            g.home_team_code AS "homeTeamCode", g.away_team_code AS "awayTeamCode"
     FROM games g
     WHERE g.season = $1 AND g.game_type IN ($2, $3) AND g.game_state IN ($4, $5)
       AND NOT EXISTS (SELECT 1 FROM skater_games s WHERE s.game_id = g.game_id)
     ORDER BY g.game_date DESC, g.game_id DESC
     LIMIT $6`,
    [season, GameState.regularSeason, GameState.playoffs, GameState.final, GameState.finalAlt, limit],
  );
  return rows;
}

/** The skater rows for one game, from the game centre model. */
export function skaterGameRows(game: FinalGame, live: Pick<LiveGameResponse, "skaters">): UpsertRow<typeof skaterGames>[] {
  return live.skaters.map((s) => {
    const isHome = s.team === "home";
    return {
      gameId: game.gameId,
      season: game.season,
      gameDate: game.gameDate,
      isPlayoffs: game.gameType === GameState.playoffs,
      playerId: s.playerId,
      name: s.name,
      position: s.position,
      team: isHome ? game.homeTeamCode : game.awayTeamCode,
      opponent: isHome ? game.awayTeamCode : game.homeTeamCode,
      isHome,
      toiSeconds: s.toiSeconds,
      goals: s.goals,
      primaryAssists: s.primaryAssists,
      secondaryAssists: s.secondaryAssists,
      shotsOnGoal: s.shotsOnGoal,
      blocks: s.blocks,
      penaltiesDrawn: s.penaltiesDrawn,
      penaltiesTaken: s.penaltiesTaken,
      faceoffWins: s.faceoffWins,
      faceoffLosses: s.faceoffLosses,
      onIceAttemptsFor5v5: s.onIceAttemptsFor5v5,
      onIceAttemptsAgainst5v5: s.onIceAttemptsAgainst5v5,
      onIceGoalsFor5v5: s.onIceGoalsFor5v5,
      onIceGoalsAgainst5v5: s.onIceGoalsAgainst5v5,
      gameScore: s.gameScore.total,
      gameScoreScoring: s.gameScore.scoring,
      gameScoreOnIce: s.gameScore.onIce,
      gameScoreOther: s.gameScore.other,
    };
  });
}

/**
 * Computes and stores Game Score for up to `limit` final games without rows.
 * Fetches are sequential. Without a shift chart there are no 5v5 on-ice stats,
 * so a game whose shifts (fetched first, so a miss costs one request),
 * play-by-play or box score didn't load is skipped rather than stored partly,
 * and tried again next run. The NHL has published no shifts at all for some
 * games (most of the first two weeks of 2026-27).
 */
export async function importSkaterGames(db: Queryable, season: number, limit: number, logger: Logger) {
  const games = await gamesMissingSkaterRows(db, season, limit);
  let written = 0;
  let skipped = 0;
  for (const game of games) {
    const shifts = await getShiftChart(game.gameId);
    const boxscore = shifts.length > 0 ? await getBoxscore(game.gameId) : null;
    const playByPlay = boxscore ? await getPlayByPlay(game.gameId) : null;
    if (!boxscore?.playerByGameStats || !playByPlay?.plays?.length) {
      skipped++;
      continue;
    }
    const live = buildLiveGame({
      gameId: game.gameId,
      landing: null,
      boxscore,
      playByPlay,
      rightRail: null,
      shifts,
      standings: new Map(),
      clubStats: {},
    });
    written += await upsert(db, skaterGames, skaterGameRows(game, live), { conflict: ["gameId", "playerId"] });
  }
  if (skipped > 0) logger.warn(`skater_games ${season}: ${skipped} games without shifts, play-by-play or box score; will retry`);
  return { games: games.length, skipped, written };
}
