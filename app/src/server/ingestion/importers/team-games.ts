import type { Readable } from "node:stream";
import { teamGames } from "@/server/db/schema";
import { parseCsv, type ParsedRecord } from "@/server/ingestion/csv";
import { upsert, type Queryable, type UpsertRow } from "@/server/ingestion/db";
import { buildMapper } from "@/server/ingestion/map";
import { normalizeTeam } from "@/server/ingestion/normalize";
import { teamGameFields } from "@/server/ingestion/records";

type TeamGameRecord = ParsedRecord<typeof teamGameFields>;

const BATCH_SIZE = 1000;

// "other" (4on4, 3on3, empty net, ...) isn't imported.
export const TEAM_GAME_SITUATIONS = new Set(["all", "5on5", "5on4", "4on5"]);

// Away team code by NHL game ID, from the games table.
export type GameAwayTeams = Map<string, string>;

export const mapTeamGame = buildMapper(teamGames, teamGameFields, {
  computed: {
    gameDate: (r: TeamGameRecord) => `${r.gameDate.slice(0, 4)}-${r.gameDate.slice(4, 6)}-${r.gameDate.slice(6, 8)}`,
    teamAbbreviation: (r: TeamGameRecord) => normalizeTeam(r.team),
    opponentAbbreviation: (r: TeamGameRecord) => normalizeTeam(r.opposingTeam),
    isHome: (r: TeamGameRecord) => r.homeOrAway === "HOME",
    isPlayoffs: (r: TeamGameRecord) => r.playoffGame !== 0,
  },
});

// In 115 Phoenix home games (2011-2013) the home row lists ARI as its own
// opponent and says AWAY; the visitor's row is right. Such rows are the home
// team's, with the opponent from the games table (null if the game isn't
// stored, so the row is skipped).
export function repairSelfOpponent(record: TeamGameRecord, awayTeams: GameAwayTeams): TeamGameRecord | null {
  if (record.team !== record.opposingTeam) return record;
  const away = awayTeams.get(record.gameId);
  return away === undefined ? null : { ...record, opposingTeam: away, homeOrAway: "HOME" };
}

export async function loadGameAwayTeams(db: Queryable, season: number | null): Promise<GameAwayTeams> {
  const { rows } = await db.query<{ game_id: string; away_team_code: string }>(
    `SELECT game_id, away_team_code FROM games WHERE $1::int IS NULL OR season = $1`,
    [season],
  );
  return new Map(rows.map((r) => [r.game_id, r.away_team_code]));
}

export interface TeamGameImportResult {
  written: number;
  // Self-opponent rows whose game isn't in the games table.
  skipped: number;
}

// Streams all_teams.csv in batches, keeping `season` only (null = every season).
export async function importTeamGames(
  db: Queryable,
  csv: Readable | string,
  season: number | null,
  awayTeams: GameAwayTeams,
): Promise<TeamGameImportResult> {
  let batch: UpsertRow<typeof teamGames>[] = [];
  const result: TeamGameImportResult = { written: 0, skipped: 0 };
  const flush = async () => {
    result.written += await upsert(db, teamGames, batch, { conflict: ["gameId", "teamAbbreviation", "situation"], batchSize: BATCH_SIZE });
    batch = [];
  };

  // One file with one header, so a missing column is a format change.
  const onMissingColumns = (columns: string[]) => {
    throw new Error(`all_teams.csv is missing columns: ${columns.join(", ")}`);
  };
  for await (const record of parseCsv(csv, teamGameFields, { onMissingColumns })) {
    if (season !== null && record.season !== season) continue;
    if (record.position !== "Team Level" || !TEAM_GAME_SITUATIONS.has(record.situation)) continue;
    const repaired = repairSelfOpponent(record, awayTeams);
    if (!repaired) {
      result.skipped++;
      continue;
    }
    batch.push(mapTeamGame(repaired));
    if (batch.length >= BATCH_SIZE) await flush();
  }
  await flush();
  return result;
}
