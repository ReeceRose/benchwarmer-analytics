import { players } from "@/server/db/schema";
import { parseCsv } from "@/server/ingestion/csv";
import { upsert, type Queryable, type UpsertRow } from "@/server/ingestion/db";
import { normalizePosition, normalizeTeam, truncInt } from "@/server/ingestion/normalize";
import { playerBioFields } from "@/server/ingestion/records";

// "First Rest Of Name" → first word, remainder. Single word → last name only.
export function parseName(name: string): { firstName: string | null; lastName: string | null } {
  if (name.trim() === "") return { firstName: null, lastName: null };
  const space = name.indexOf(" ");
  return space === -1
    ? { firstName: null, lastName: name }
    : { firstName: name.slice(0, space), lastName: name.slice(space + 1) };
}

// `6' 3"` → 75
export function parseHeight(height: string | null): number | null {
  const match = height ? /(\d+)'\s*(\d+)"?/.exec(height) : null;
  return match ? Number(match[1]) * 12 + Number(match[2]) : null;
}

// Accepts ISO dates (MoneyPuck uses YYYY-MM-DD); anything unparseable → null.
export function parseBirthDate(value: string | null): string | null {
  const match = value ? /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(value.trim()) : null;
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

// Player bios: every bio field is overwritten for existing players.
export async function importPlayerBios(db: Queryable, csv: string): Promise<number> {
  const rows: UpsertRow<typeof players>[] = [];
  for await (const bio of parseCsv(csv, playerBioFields)) {
    rows.push({
      id: bio.playerId,
      name: bio.name,
      ...parseName(bio.name),
      // Normalized like season imports (L/R → LW/RW); raw L/R would drop
      // wingers from LW/RW-based forward filters.
      position: normalizePosition(bio.primaryPosition ?? bio.position),
      currentTeamAbbreviation: normalizeTeam(bio.team),
      headshotUrl: null,
      birthDate: parseBirthDate(bio.birthDate),
      heightInches: parseHeight(bio.height),
      weightLbs: bio.weightLbs === null ? null : truncInt(bio.weightLbs),
      shoots: bio.shoots,
    });
  }
  return upsert(db, players, rows, { conflict: ["id"] });
}
