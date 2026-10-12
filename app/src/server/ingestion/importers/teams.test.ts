import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseCsv } from "@/server/ingestion/csv";
import type { Queryable } from "@/server/ingestion/db";
import { importTeams } from "@/server/ingestion/importers/teams";
import { teamExpectedHeaders, teamFields } from "@/server/ingestion/records";

// Two "Team Level" rows (MIN, MTL) and two of the per-player rows that
// teams.csv mixes in (Carey Price, Alex Kovalev).
const csv = fs.readFileSync(path.join(__dirname, "..", "__fixtures__", "teams_2008_mixed_sample.csv"), "utf8");

async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const item of iterable) out.push(item);
  return out;
}

// Captures the rows each upsert statement sends, keyed by table name.
function recordingDb() {
  const written: Record<string, Record<string, unknown>[]> = {};
  const db = {
    query: async (text: string, params: unknown[]) => {
      const table = /INSERT INTO "(\w+)"/.exec(text)?.[1] ?? "?";
      const rows = JSON.parse(params[0] as string) as Record<string, unknown>[];
      (written[table] ??= []).push(...rows);
      return { rowCount: rows.length };
    },
  } as unknown as Queryable;
  return { db, written };
}

describe("teams.csv", () => {
  it("maps fields by index despite the duplicate team header", async () => {
    const rows = await collect(parseCsv(csv, teamFields, { expectedHeaders: teamExpectedHeaders }));
    expect(rows).toHaveLength(4);
    expect(rows[0]).toMatchObject({
      team: "MIN", season: 2008, name: "MIN", position: "Team Level", situation: "other", gamesPlayed: 82,
    });
    expect(rows[1]).toMatchObject({
      team: "MTL", season: 2008, name: "MTL", position: "Team Level", situation: "all", gamesPlayed: 82,
    });
    expect(rows[2]).toMatchObject({ team: "MTL", name: "Carey Price", position: "G", situation: "all", gamesPlayed: 4 });
  });

  it("imports only Team Level rows", async () => {
    const { db, written } = recordingDb();
    await importTeams(db, csv, true);

    expect(written.teams.map((t) => [t.abbreviation, t.name])).toEqual([
      ["MIN", "Minnesota Wild"],
      ["MTL", "Montréal Canadiens"],
    ]);
    expect(written.team_seasons).toHaveLength(2);
    expect(written.team_seasons.map((s) => [s.team_abbreviation, s.situation, s.games_played, s.is_playoffs])).toEqual([
      ["MIN", "other", 82, true],
      ["MTL", "all", 82, true],
    ]);
  });
});
