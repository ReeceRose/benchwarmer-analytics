import type { Readable } from "node:stream";
import { shots } from "@/server/db/schema";
import { parseCsv, type ParsedRecord } from "@/server/ingestion/csv";
import { upsert, type Queryable, type UpsertRow } from "@/server/ingestion/db";
import { buildMapper } from "@/server/ingestion/map";
import { normalizeTeam, toNhlGameId } from "@/server/ingestion/normalize";
import { shotFields } from "@/server/ingestion/records";

type ShotRecord = ParsedRecord<typeof shotFields>;

const BATCH_SIZE = 1000;

// 128 same-named fields are copied by the generic mapper; these are the
// exceptions.
export const mapShot = buildMapper(shots, shotFields, {
  computed: {
    gameId: (r: ShotRecord) => toNhlGameId(r.gameId, r.season),
    homeTeamCode: (r: ShotRecord) => normalizeTeam(r.homeTeamCode),
    awayTeamCode: (r: ShotRecord) => normalizeTeam(r.awayTeamCode),
    team: (r: ShotRecord) => normalizeTeam(r.team),
    teamCode: (r: ShotRecord) => normalizeTeam(r.teamCode),
    isGoal: (r: ShotRecord) => Number(r.goal) !== 0,
    shotPlayContinued: (r: ShotRecord) => r.shotPlayContinued !== null && Number(r.shotPlayContinued) !== 0,
  },
});

export interface ShotImportOptions {
  // Only import shots for games in this set (incremental mode). Undefined = all.
  includeGame?: (gameId: string) => boolean;
}

export interface ShotImportResult {
  written: number;
  rowsRead: number;
  rowsConsidered: number;
  gameIds: Set<string>;
}

// Streams a season's shots CSV in batches.
export async function importShots(db: Queryable, csv: Readable | string, options: ShotImportOptions = {}): Promise<ShotImportResult> {
  let batch: UpsertRow<typeof shots>[] = [];
  const result: ShotImportResult = { written: 0, rowsRead: 0, rowsConsidered: 0, gameIds: new Set() };
  const flush = async () => {
    result.written += await upsert(db, shots, batch, { conflict: ["gameId", "eventId"], batchSize: BATCH_SIZE });
    batch = [];
  };

  // MoneyPuck repeats some events under a new shotID (2008); the first wins.
  const seen = new Set<string>();
  for await (const record of parseCsv(csv, shotFields)) {
    result.rowsRead++;
    const row = mapShot(record);
    const gameId = row.gameId as string;
    if (options.includeGame && !options.includeGame(gameId)) continue;
    const key = `${gameId}|${row.eventId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.rowsConsidered++;
    result.gameIds.add(gameId);
    batch.push(row);
    if (batch.length >= BATCH_SIZE) await flush();
  }
  await flush();
  return result;
}

// Games to (re)import for a season in incremental mode: games with no stored
// shots, plus recent games (MoneyPuck corrects recent data for a few days).
// MoneyPuck shot rows have no date, so "recent" comes from the games table
// when it has dates, falling back to the last `fallbackRecentGames` game numbers.
export async function incrementalGameFilter(
  db: Queryable,
  season: number,
  recentDays: number,
  fallbackRecentGames = 60,
): Promise<(gameId: string) => boolean> {
  const { rows: stored } = await db.query<{ game_id: string }>(
    `SELECT DISTINCT game_id FROM shots WHERE season = $1`,
    [season],
  );
  const { rows: recent } = await db.query<{ game_id: string }>(
    `SELECT game_id FROM games WHERE season = $1 AND game_date >= (now() AT TIME ZONE 'America/New_York')::date - $2::int`,
    [season, recentDays],
  );
  const existing = new Set(stored.map((r) => r.game_id));
  const recentIds = new Set(recent.map((r) => r.game_id));
  if (recentIds.size === 0) {
    for (const id of [...existing].sort().slice(-fallbackRecentGames)) recentIds.add(id);
  }
  return (gameId) => !existing.has(gameId) || recentIds.has(gameId);
}
