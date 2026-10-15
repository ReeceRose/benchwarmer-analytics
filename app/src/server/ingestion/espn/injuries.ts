// ESPN's league injury list → injury stints (player_injuries). The list is a
// snapshot, so each run reconciles: athletes on the list get an open stint
// (inserted or updated), and open stints for athletes no longer listed are
// resolved. A response that's much shorter than what's open is treated as a
// bad response rather than a mass recovery (see `shouldResolve`).

import type { Queryable } from "@/server/ingestion/db";
import {
  athleteIdFromLinks,
  espnDate,
  EspnFormatError,
  fetchInjuries,
  type EspnInjury,
  type EspnTeamInjuries,
} from "@/server/ingestion/espn/client";
import { PlayerIndex, resolveAthletes } from "@/server/ingestion/espn/players";
import type { Logger } from "@/server/ingestion/sync-runs";
import type { InjuryStatus } from "@/types";


/** ESPN's status label → ours. LTIR counts as IR. */
export function injuryStatus(statusText: string, typeName?: string | null): InjuryStatus {
  const s = `${statusText} ${typeName ?? ""}`.toLowerCase();
  if (s.includes("injured reserve") || s.includes("status_ir") || /\bltir\b/.test(s)) return "ir";
  if (s.includes("day-to-day") || s.includes("daytoday") || s.includes("day to day")) return "day_to_day";
  if (s.includes("suspen")) return "suspended";
  if (s.includes("out")) return "out";
  return "other";
}

// Some entries carry a bare status ("ir", "day-to-day") instead of a sentence.
export const usefulComment = (c: string | null | undefined) => (c && c.trim().length >= 20 ? c.trim() : null);

// ESPN fills empty detail fields with "Not Specified".
const specified = (v: string | null | undefined) => (v && v !== "Not Specified" ? v : null);

export interface InjuryRow {
  espn_athlete_id: string;
  player_id: number | null;
  player_name: string;
  team: string;
  position: string | null;
  status: InjuryStatus;
  status_text: string;
  injury_type: string | null;
  detail: string | null;
  side: string | null;
  comment: string | null;
  reported_at: string | null;
  expected_return: string | null;
}

export function toInjuryRow(entry: EspnInjury, espnId: string, team: string, playerId: number | null): InjuryRow {
  const returnDate = entry.details?.returnDate?.slice(0, 10) ?? null;
  return {
    espn_athlete_id: espnId,
    player_id: playerId,
    player_name: entry.athlete.displayName,
    team,
    position: entry.athlete.position?.abbreviation ?? null,
    status: injuryStatus(entry.status, entry.type?.name),
    status_text: entry.status,
    injury_type: specified(entry.details?.type),
    detail: specified(entry.details?.detail),
    side: specified(entry.details?.side),
    comment: usefulComment(entry.shortComment),
    reported_at: espnDate(entry.date)?.toISOString() ?? null,
    expected_return: returnDate && /^\d{4}-\d{2}-\d{2}$/.test(returnDate) ? returnDate : null,
  };
}

/**
 * Whether a list is complete enough to resolve the stints missing from it.
 * ESPN occasionally returns an empty or partial list; resolving against that
 * would mark half the league healthy. Real lists change by a few players a
 * day, so a list under half of what's open (once 20+ are open) is suspect.
 */
export function shouldResolve(listed: number, open: number): boolean {
  if (open === 0) return true;
  if (listed === 0) return false;
  return open < 20 || listed >= open * 0.5;
}

export interface InjuryResult {
  listed: number;
  inserted: number;
  updated: number;
  resolved: number;
  skipped: number;
  unmatchedPlayers: number;
  athletesWritten: number;
}

/** Every entry with an athlete ID and a known team, plus a count of the rest. */
export function flattenInjuries(teams: readonly EspnTeamInjuries[]) {
  const entries: { entry: EspnInjury; espnId: string; team: string }[] = [];
  let skipped = 0;
  for (const t of teams) {
    skipped += t.injuries.skipped;
    for (const entry of t.injuries.entries) {
      const espnId = athleteIdFromLinks(entry.athlete.links ?? undefined);
      if (!espnId || !t.team) skipped++;
      else entries.push({ entry, espnId, team: t.team });
    }
  }
  return { entries, skipped };
}

// One statement, so the three changes apply together or not at all. Every CTE
// sees the table as it was before the statement, which is what each needs:
// update and resolve touch only open stints, insert only athletes without one.
const RECONCILE_SQL = `
WITH listed AS (
  SELECT * FROM json_populate_recordset(NULL::player_injuries, $1::json)
),
updated AS (
  UPDATE player_injuries p SET
    player_id = l.player_id, player_name = l.player_name, team = l.team, position = l.position,
    status = l.status, status_text = l.status_text, injury_type = l.injury_type, detail = l.detail,
    side = l.side, comment = l.comment, reported_at = l.reported_at, expected_return = l.expected_return,
    updated_at = now()
  FROM listed l
  WHERE p.espn_athlete_id = l.espn_athlete_id AND p.resolved_at IS NULL
    AND (p.player_id, p.player_name, p.team, p.position, p.status, p.status_text, p.injury_type, p.detail,
         p.side, p.comment, p.reported_at, p.expected_return)
    IS DISTINCT FROM
        (l.player_id, l.player_name, l.team, l.position, l.status, l.status_text, l.injury_type, l.detail,
         l.side, l.comment, l.reported_at, l.expected_return)
  RETURNING 1
),
inserted AS (
  INSERT INTO player_injuries (espn_athlete_id, player_id, player_name, team, position, status, status_text,
    injury_type, detail, side, comment, reported_at, expected_return)
  SELECT espn_athlete_id, player_id, player_name, team, position, status, status_text,
    injury_type, detail, side, comment, reported_at, expected_return
  FROM listed l
  WHERE NOT EXISTS (
    SELECT 1 FROM player_injuries p WHERE p.espn_athlete_id = l.espn_athlete_id AND p.resolved_at IS NULL
  )
  RETURNING 1
),
resolved AS (
  UPDATE player_injuries p SET resolved_at = now(), updated_at = now()
  WHERE p.resolved_at IS NULL AND $2::boolean
    AND NOT EXISTS (SELECT 1 FROM listed l WHERE l.espn_athlete_id = p.espn_athlete_id)
  RETURNING 1
)
SELECT (SELECT count(*) FROM updated)::int AS updated,
       (SELECT count(*) FROM inserted)::int AS inserted,
       (SELECT count(*) FROM resolved)::int AS resolved`;

export async function importInjuries(db: Queryable, logger: Logger): Promise<InjuryResult> {
  const teams = await fetchInjuries();
  const { entries, skipped } = flattenInjuries(teams);

  // An athlete listed twice (a mid-season trade) keeps the newest entry.
  const latest = new Map<string, (typeof entries)[number]>();
  for (const e of entries) {
    const prev = latest.get(e.espnId);
    if (!prev || (espnDate(e.entry.date)?.getTime() ?? 0) > (espnDate(prev.entry.date)?.getTime() ?? 0)) latest.set(e.espnId, e);
  }
  const listedEntries = [...latest.values()];

  const index = await PlayerIndex.load(db);
  const athletes = await resolveAthletes(
    db,
    listedEntries.map(({ entry, espnId, team }) => ({
      espnId,
      name: entry.athlete.displayName,
      team,
      position: entry.athlete.position?.abbreviation ?? null,
    })),
    index,
    logger,
  );
  const rows = listedEntries.map(({ entry, espnId, team }) => toInjuryRow(entry, espnId, team, athletes.players.get(espnId) ?? null));

  const { rows: openRows } = await db.query<{ open: number }>(
    `SELECT count(*)::int AS open FROM player_injuries WHERE resolved_at IS NULL`,
  );
  const open = openRows[0].open;
  const resolve = shouldResolve(rows.length, open);

  const { rows: counts } = await db.query<{ updated: number; inserted: number; resolved: number }>(RECONCILE_SQL, [
    JSON.stringify(rows),
    resolve,
  ]);
  const result: InjuryResult = {
    listed: rows.length,
    ...counts[0],
    skipped,
    unmatchedPlayers: athletes.unmatched,
    athletesWritten: athletes.written,
  };
  logger.info(`espn_injuries: ${JSON.stringify(result)}`);
  if (!resolve) {
    // Listed players were still updated; nobody was marked healthy.
    throw new EspnFormatError(
      `ESPN injuries listed ${rows.length} players but ${open} stints are open; not resolving any (likely a partial response)`,
    );
  }
  return result;
}
