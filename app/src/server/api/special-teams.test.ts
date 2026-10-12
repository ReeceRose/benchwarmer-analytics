import { describe, expect, it } from "vitest";
import { matchesPosition, sortByKey, teamSpecialTeamsRanking } from "@/server/api/special-teams";
import type { teamSeasons } from "@/server/db/schema";

type TeamSeasonRow = typeof teamSeasons.$inferSelect;

describe("matchesPosition", () => {
  it("F matches C/LW/RW; D matches by prefix; no filter matches all", () => {
    expect(["C", "LW", "RW", "D", null].map((p) => matchesPosition(p, "f"))).toEqual([true, true, true, false, false]);
    expect(matchesPosition("D", "D")).toBe(true);
    expect(matchesPosition("C", "D")).toBe(false);
    expect(matchesPosition(null, undefined)).toBe(true);
  });
});

describe("sortByKey", () => {
  it("is stable in both directions", () => {
    const rows = [{ id: 1, v: 2 }, { id: 2, v: 1 }, { id: 3, v: 2 }];
    expect(sortByKey([...rows], (r) => r.v, false).map((r) => r.id)).toEqual([1, 3, 2]);
    expect(sortByKey([...rows], (r) => r.v, true).map((r) => r.id)).toEqual([2, 1, 3]);
  });
});

describe("teamSpecialTeamsRanking", () => {
  it("combines PP% and PK%", () => {
    const pp = { iceTime: 19560, goalsFor: 53, xGoalsFor: 33.5, shotsOnGoalFor: 333 } as TeamSeasonRow;
    const pk = { iceTime: 22200, goalsAgainst: 36, xGoalsAgainst: 46.8, shotsOnGoalAgainst: 268 } as TeamSeasonRow;
    const r = teamSpecialTeamsRanking({ abbreviation: "NJD", name: "NJD" }, pp, pk, 3, 5, 1);
    expect(r).toMatchObject({
      ppOpportunities: 163,
      ppPct: 32.5,
      ppXgPer60: 6.17,
      pkTimesShort: 185,
      pkPct: 80.5,
      pkSvPct: 86.6,
      specialTeamsPct: 113.1,
    });
  });

  it("missing stats are zeros", () => {
    const r = teamSpecialTeamsRanking({ abbreviation: "X", name: "X" }, undefined, undefined, 32, 32, 32);
    expect(r.ppOpportunities).toBe(0);
    expect(r.pkPct).toBe(0);
  });
});
