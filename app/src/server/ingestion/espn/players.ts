// Matching ESPN's players to ours (NHL IDs). ESPN's feeds carry only ESPN
// athlete IDs and names, so a match is by name, confirmed by date of birth
// where we have one. Unmatched athletes are stored with a null player and
// retried on later runs; a failed match never stops a step.

import { espnPlayers } from "@/server/db/schema";
import { upsert, type Queryable } from "@/server/ingestion/db";
import { fetchAthlete } from "@/server/ingestion/espn/client";
import type { Logger } from "@/server/ingestion/sync-runs";

export type MatchMethod = "name_dob" | "name_team" | "name" | "manual" | "none";

export interface Candidate {
  id: number;
  name: string;
  team: string | null;
  birthDate: string | null;
}

export interface Match {
  playerId: number | null;
  method: MatchMethod;
}

const SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv"]);

/** Lowercase, accents folded, punctuation and suffixes dropped: "Pierre-Luc Dubois Jr." → "pierre luc dubois". */
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z\s-]/g, "")
    .replace(/-/g, " ")
    .split(/\s+/)
    .filter((w) => w && !SUFFIXES.has(w))
    .join(" ");
}

const lastWord = (normalized: string) => normalized.slice(normalized.lastIndexOf(" ") + 1);

export class PlayerIndex {
  private byName = new Map<string, Candidate[]>();
  private byLastName = new Map<string, Candidate[]>();

  constructor(candidates: readonly Candidate[]) {
    for (const c of candidates) {
      const name = normalizeName(c.name);
      push(this.byName, name, c);
      push(this.byLastName, lastWord(name), c);
    }
  }

  static async load(db: Queryable): Promise<PlayerIndex> {
    const { rows } = await db.query<Candidate>(
      `SELECT id, name, current_team_abbreviation AS team, birth_date::text AS "birthDate" FROM players`,
    );
    return new PlayerIndex(rows);
  }

  /**
   * Best match for a name. With a date of birth, a same-name player born that
   * day wins, then a same-last-name one (ESPN "Mitch" vs our "Mitchell").
   * Otherwise a unique same-name player on the team, then a unique name.
   * A unique name whose known birthday differs is not a match.
   */
  match(name: string, opts: { birthDate?: string | null; team?: string | null } = {}): Match {
    const normalized = normalizeName(name);
    const sameName = this.byName.get(normalized) ?? [];
    const { birthDate, team } = opts;
    if (birthDate) {
      const born = sameName.filter((c) => c.birthDate === birthDate);
      if (born.length === 1) return { playerId: born[0].id, method: "name_dob" };
      const sameLast = (this.byLastName.get(lastWord(normalized)) ?? []).filter((c) => c.birthDate === birthDate);
      if (born.length === 0 && sameLast.length === 1) return { playerId: sameLast[0].id, method: "name_dob" };
    }
    const plausible = birthDate ? sameName.filter((c) => !c.birthDate || c.birthDate === birthDate) : sameName;
    if (team) {
      const onTeam = plausible.filter((c) => c.team === team);
      if (onTeam.length === 1) return { playerId: onTeam[0].id, method: "name_team" };
    }
    if (plausible.length === 1) return { playerId: plausible[0].id, method: "name" };
    return { playerId: null, method: "none" };
  }
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

export interface EspnAthleteRef {
  espnId: string;
  name: string;
  team: string | null;
  position: string | null;
}

interface StoredAthlete {
  espnId: string;
  playerId: number | null;
  birthDate: string | null;
  matchMethod: MatchMethod;
}

/**
 * ESPN athlete ID → our player ID for every athlete given. New athletes get
 * one ESPN request each for their date of birth (stored, so it's asked once);
 * unmatched ones are re-matched from the stored details. Manual matches are
 * never touched.
 */
export async function resolveAthletes(
  db: Queryable,
  athletes: readonly EspnAthleteRef[],
  index: PlayerIndex,
  logger: Logger,
): Promise<{ players: Map<string, number | null>; unmatched: number; written: number }> {
  const unique = [...new Map(athletes.map((a) => [a.espnId, a])).values()];
  const { rows } = await db.query<StoredAthlete>(
    `SELECT espn_id AS "espnId", player_id AS "playerId", birth_date::text AS "birthDate", match_method AS "matchMethod"
     FROM espn_players WHERE espn_id = ANY($1)`,
    [unique.map((a) => a.espnId)],
  );
  const stored = new Map(rows.map((r) => [r.espnId, r]));

  const players = new Map<string, number | null>();
  const upserts = [];
  let lookupFailures = 0;
  for (const athlete of unique) {
    const known = stored.get(athlete.espnId);
    if (known && (known.playerId !== null || known.matchMethod === "manual")) {
      players.set(athlete.espnId, known.playerId);
      continue;
    }
    let birthDate = known?.birthDate ?? null;
    let position = athlete.position;
    if (!known) {
      try {
        const details = await fetchAthlete(athlete.espnId);
        // "2004-01-19T08:00Z": the date part is the birthday.
        const dob = details?.dateOfBirth?.slice(0, 10) ?? "";
        birthDate = /^\d{4}-\d{2}-\d{2}$/.test(dob) ? dob : null;
        position = details?.position?.abbreviation ?? position;
      } catch (error) {
        // Match on name alone this time; the next run asks again.
        lookupFailures++;
        logger.warn(`espn athlete ${athlete.espnId}: ${error instanceof Error ? error.message : String(error)}`);
        players.set(athlete.espnId, index.match(athlete.name, { team: athlete.team }).playerId);
        continue;
      }
    }
    const match = index.match(athlete.name, { birthDate, team: athlete.team });
    players.set(athlete.espnId, match.playerId);
    upserts.push({
      espnId: athlete.espnId,
      playerId: match.playerId,
      name: athlete.name,
      position,
      birthDate,
      matchMethod: match.method,
    });
  }
  if (lookupFailures > 0) logger.warn(`espn athletes: ${lookupFailures} lookups failed`);
  const written = await upsert(db, espnPlayers, upserts, { conflict: ["espnId"] });
  const unmatched = [...players.values()].filter((id) => id === null).length;
  return { players, unmatched, written };
}
