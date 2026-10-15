import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Queryable } from "@/server/ingestion/db";
import { importTeamGames } from "@/server/ingestion/importers/team-games";

// NYR's 2008 opener ("other" and "all"), both 5on5 rows of a 2011 Phoenix home
// game where MoneyPuck lists ARI as its own opponent, and a 2010 playoff row.
const csv = fs.readFileSync(path.join(__dirname, "..", "__fixtures__", "all_teams_sample.csv"), "utf8");

const awayTeams = new Map([["2011020055", "WPG"]]);

// Captures the rows each upsert statement sends.
function recordingDb() {
  const written: Record<string, unknown>[] = [];
  const db = {
    query: async (_text: string, params: unknown[]) => {
      const rows = JSON.parse(params[0] as string) as Record<string, unknown>[];
      written.push(...rows);
      return { rowCount: rows.length };
    },
  } as unknown as Queryable;
  return { db, written };
}

const summary = (r: Record<string, unknown>) => [
  r.game_id, r.season, r.game_date, r.team_abbreviation, r.opponent_abbreviation, r.is_home, r.is_playoffs, r.situation,
];

describe("all_teams.csv", () => {
  it("imports team-game rows, skipping 'other' and repairing self-opponent rows", async () => {
    const { db, written } = recordingDb();
    const result = await importTeamGames(db, csv, null, awayTeams);

    expect(result).toEqual({ written: 4, skipped: 0 });
    expect(written.map(summary)).toEqual([
      ["2008020001", 2008, "2008-10-04", "NYR", "TBL", false, false, "all"],
      ["2011020055", 2011, "2011-10-15", "WPG", "ARI", false, false, "5on5"],
      ["2011020055", 2011, "2011-10-15", "ARI", "WPG", true, false, "5on5"],
      ["2010030141", 2010, "2011-04-13", "TBL", "PIT", false, true, "all"],
    ]);
    expect(written[0]).toMatchObject({ ice_time: "3600.0", x_goals_for: "2.287", shots_on_goal_for: 41, goals_for: 2 });
  });

  it("filters to one season and skips self-opponent rows with no stored game", async () => {
    const { db, written } = recordingDb();
    const result = await importTeamGames(db, csv, 2011, new Map());

    expect(result).toEqual({ written: 1, skipped: 1 });
    expect(written.map((r) => r.team_abbreviation)).toEqual(["WPG"]);
  });
});
