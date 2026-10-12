import { lineCombinations } from "@/server/db/schema";
import { parseCsv, type ParsedRecord } from "@/server/ingestion/csv";
import { upsert, type Queryable, type UpsertRow } from "@/server/ingestion/db";
import { doubleToDecimal, normalizeTeam, truncInt } from "@/server/ingestion/normalize";
import { lineFields } from "@/server/ingestion/records";
import type { Logger } from "@/server/ingestion/sync-runs";

type LineRecord = ParsedRecord<typeof lineFields>;

interface Candidate {
  id: number;
  position: string | null;
}

const LAST_NAME_PREFIXES = ["st.", "st", "van", "de", "del", "da", "la", "le", "mc", "mac", "o'"];

// Last name from a full name, keeping particles ("Van Riemsdyk", "St. Louis").
export function extractLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? "";
  for (let i = 1; i < parts.length; i++) {
    if (LAST_NAME_PREFIXES.includes(parts[i].toLowerCase())) return parts.slice(i).join(" ");
  }
  return parts[parts.length - 1];
}

// Splits "Ekman-Larsson-Keller" into last names, greedily joining up to three
// hyphen-separated parts that form a known last name.
export function parsePlayerNames(lineName: string, knownLastNames: Set<string>): string[] {
  const parts = lineName
    .split("-")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length <= 2) return parts;
  const result: string[] = [];
  let i = 0;
  while (i < parts.length) {
    let matched = false;
    for (let len = Math.min(3, parts.length - i); len >= 1; len--) {
      const candidate = parts.slice(i, i + len).join("-");
      if (nameKeys(candidate).some((key) => knownLastNames.has(key))) {
        result.push(candidate);
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) {
      result.push(parts[i]);
      i++;
    }
  }
  return result;
}

// Line names are ASCII ("Valimaki") and occasionally mangled ("Blmel" for
// Blümel), so players are indexed under an accent-folded and a non-ASCII-
// stripped form of their last name.
export function nameKeys(lastName: string): string[] {
  const lower = lastName.toLowerCase();
  const folded = lower.normalize("NFD").replace(/\p{M}/gu, "");
  // eslint-disable-next-line no-control-regex
  const stripped = lower.replace(/[^\x00-\x7f]/g, "");
  return [...new Set([folded, stripped].filter(Boolean))];
}

const isDefense = (position: string | null) => position?.toUpperCase() === "D";
const isForward = (position: string | null) =>
  ["C", "L", "R", "LW", "RW", "F", "W"].includes(position?.toUpperCase() ?? "");

export interface PlayerIndex {
  bySeasonTeam: Map<string, Candidate[]>;
  byLastName: Map<string, Candidate[]>;
  knownLastNames: Set<string>;
  // "<playerId>|<season>" for players with a skater row that season.
  activeInSeason: Set<string>;
  playerIds: Set<number>;
}

function addCandidate(map: Map<string, Candidate[]>, key: string, candidate: Candidate) {
  const list = map.get(key) ?? [];
  if (!list.some((c) => c.id === candidate.id)) list.push(candidate);
  map.set(key, list);
}

// Lookups built from players + the seasons' skater rows (team history
// disambiguates shared last names).
export async function loadPlayerIndex(db: Queryable, seasons: number[]): Promise<PlayerIndex> {
  const { rows: playerRows } = await db.query<{ id: number; name: string; last_name: string | null; position: string | null }>(
    `SELECT id, name, last_name, position FROM players WHERE name <> ''`,
  );
  const { rows: seasonRows } = await db.query<{ player_id: number; season: number; team: string }>(
    `SELECT DISTINCT player_id, season, team FROM skater_seasons WHERE season = ANY($1::int[])`,
    [seasons],
  );

  const players = new Map<number, Candidate & { lastName: string }>();
  for (const p of playerRows) {
    const lastName = (p.last_name ? p.last_name : extractLastName(p.name)).toLowerCase();
    players.set(p.id, { id: p.id, position: p.position, lastName });
  }

  const byLastName = new Map<string, Candidate[]>();
  const knownLastNames = new Set<string>();
  for (const p of players.values()) {
    for (const key of nameKeys(p.lastName)) {
      knownLastNames.add(key);
      addCandidate(byLastName, key, { id: p.id, position: p.position });
    }
  }

  const bySeasonTeam = new Map<string, Candidate[]>();
  const activeInSeason = new Set<string>();
  for (const s of seasonRows) {
    activeInSeason.add(`${s.player_id}|${s.season}`);
    const p = players.get(s.player_id);
    if (!p) continue;
    for (const key of nameKeys(p.lastName)) {
      addCandidate(bySeasonTeam, `${key}|${s.season}|${s.team.toUpperCase()}`, { id: p.id, position: p.position });
    }
  }
  return { bySeasonTeam, byLastName, knownLastNames, activeInSeason, playerIds: new Set(players.keys()) };
}

type Resolution = { id: number } | { error: "ambiguous" | "not found" };

// MoneyPuck lineId is the players' 7-digit NHL IDs concatenated
// ("847842484808068481754"). Returns null if it doesn't decode to 2-3 known players.
export function decodeLineId(lineId: string, known: Set<number>): number[] | null {
  if (!/^\d+$/.test(lineId) || lineId.length % 7 !== 0) return null;
  const ids = lineId.match(/\d{7}/g)!.map(Number);
  if (ids.length < 2 || ids.length > 3 || !ids.every((id) => known.has(id))) return null;
  return ids;
}

// Resolves one last name to a player on the line's team and season. When
// that's still ambiguous, prefer players who played that season. MoneyPuck lists one (final) team per skater season, so players
// traded mid-season miss the season+team lookup.
export function resolvePlayer(index: PlayerIndex, lastName: string, season: number, team: string, defenseLine: boolean): Resolution {
  const name = nameKeys(lastName)[0] ?? "";
  const byPosition = (list: Candidate[]) =>
    list.length > 1 ? list.filter((c) => (defenseLine ? isDefense(c.position) : isForward(c.position))) : list;

  const exact = index.bySeasonTeam.get(`${name}|${season}|${team.toUpperCase()}`);
  if (exact) {
    const filtered = byPosition(exact);
    if (filtered.length === 1) return { id: filtered[0].id };
    if (filtered.length === 0 && exact.length === 1) return { id: exact[0].id };
    return { error: "ambiguous" };
  }
  const fallback = index.byLastName.get(name);
  if (fallback) {
    let filtered = byPosition(fallback);
    if (filtered.length > 1) filtered = filtered.filter((c) => index.activeInSeason.has(`${c.id}|${season}`));
    return filtered.length === 1 ? { id: filtered[0].id } : { error: "ambiguous" };
  }
  return { error: "not found" };
}

// Fallback when lineId can't be decoded: match players by last name.
function resolveByNames(index: PlayerIndex, r: LineRecord, team: string): { ids: number[] } | { error: string } {
  const names = parsePlayerNames(r.name, index.knownLastNames);
  if (names.length < 2) return { error: "invalid name" };
  const ids: number[] = [];
  for (const name of names) {
    const resolved = resolvePlayer(index, name, r.season, team, isDefense(r.position));
    if ("error" in resolved) return resolved;
    ids.push(resolved.id);
  }
  return { ids };
}

function lineRow(r: LineRecord, team: string, ids: number[]): UpsertRow<typeof lineCombinations> {
  return {
    season: r.season,
    team,
    situation: r.situation,
    player1Id: ids[0],
    player2Id: ids[1],
    player3Id: ids[2] ?? null,
    gamesPlayed: r.gamesPlayed,
    iceTimeSeconds: truncInt(r.iceTime),
    goalsFor: truncInt(r.goalsFor),
    goalsAgainst: truncInt(r.goalsAgainst),
    expectedGoalsFor: doubleToDecimal(r.xGoalsFor),
    expectedGoalsAgainst: doubleToDecimal(r.xGoalsAgainst),
    expectedGoalsPct: doubleToDecimal(r.xGoalsPercentage),
    corsiFor: truncInt(r.shotAttemptsFor),
    corsiAgainst: truncInt(r.shotAttemptsAgainst),
    corsiPct: doubleToDecimal(r.corsiPercentage),
  };
}

// Players come from the lineId column (exact), falling back to last-name
// matching; unresolvable lines are skipped and counted. Run after the season's skaters are imported.
export async function importLines(db: Queryable, csv: string, logger: Logger): Promise<{ written: number; skipped: number }> {
  const records: LineRecord[] = [];
  for await (const r of parseCsv(csv, lineFields)) records.push(r);
  if (records.length === 0) return { written: 0, skipped: 0 };

  const index = await loadPlayerIndex(db, [...new Set(records.map((r) => r.season))]);
  const seen = new Set<string>();
  const rows: UpsertRow<typeof lineCombinations>[] = [];
  const skippedReasons = new Map<string, number>();
  const skip = (reason: string) => skippedReasons.set(reason, (skippedReasons.get(reason) ?? 0) + 1);

  let fromNames = 0;
  for (const r of records) {
    const team = normalizeTeam(r.team);
    const decoded = decodeLineId(r.lineId, index.playerIds);
    const ids: number[] = decoded ?? [];
    if (!decoded) {
      const resolved = resolveByNames(index, r, team);
      if ("error" in resolved) {
        skip(resolved.error);
        continue;
      }
      ids.push(...resolved.ids);
      fromNames++;
    }
    ids.sort((a, b) => a - b);
    // First occurrence wins.
    const key = [r.season, team, r.situation, ids[0], ids[1], ids[2] ?? null].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(lineRow(r, team, ids));
  }

  if (fromNames > 0) logger.info(`lines: ${fromNames} of ${records.length} resolved by name (lineId unusable)`);
  const skipped = [...skippedReasons.values()].reduce((a, b) => a + b, 0);
  if (skipped > 0) {
    logger.warn(`lines: skipped ${skipped} of ${records.length} (${[...skippedReasons].map(([k, v]) => `${k}: ${v}`).join(", ")})`);
  }
  const written = await upsert(db, lineCombinations, rows, {
    conflict: ["season", "team", "situation", "player1Id", "player2Id", "player3Id"],
  });
  return { written, skipped };
}
