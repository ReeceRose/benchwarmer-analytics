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
    const r = teamSpecialTeamsRanking({ abbreviation: "NJD", name: "NJD" }, pp, pk, undefined, 3, 5, 1);
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
    const r = teamSpecialTeamsRanking({ abbreviation: "X", name: "X" }, undefined, undefined, undefined, 32, 32, 32);
    expect(r.ppOpportunities).toBe(0);
    expect(r.pkPct).toBe(0);
    expect(r).toMatchObject({ penaltiesDrawn: 0, penaltiesDrawnPer60: 0, ppMinutesPerGame: 0, ppGoalsPer60: 0 });
  });

  it("drawn is the opponent's penalties; rates are per 60 of all-situations time", () => {
    const pp = { iceTime: 21000, goalsFor: 50, xGoalsFor: 40, shotsOnGoalFor: 300 } as TeamSeasonRow;
    const pk = { iceTime: 24000, goalsAgainst: 40, xGoalsAgainst: 45, shotsOnGoalAgainst: 280 } as TeamSeasonRow;
    const all = {
      gamesPlayed: 82,
      iceTime: 300000,
      penaltiesFor: 300,
      penaltiesAgainst: 325,
      penaltyMinutesFor: 700,
      penaltyMinutesAgainst: 720,
    } as TeamSeasonRow;
    const r = teamSpecialTeamsRanking({ abbreviation: "BOS", name: "BOS" }, pp, pk, all, 1, 1, 1);
    expect(r).toMatchObject({
      gamesPlayed: 82,
      penaltiesDrawn: 325,
      penaltiesTaken: 300,
      netPenalties: 25,
      penaltiesDrawnPer60: 3.9,
      penaltiesTakenPer60: 3.6,
      netPenaltiesPer60: 0.3,
      pimDrawn: 720,
      pimTaken: 700,
      ppMinutesPerGame: 4.27,
      pkMinutesPerGame: 4.88,
      ppGoalsPer60: 8.57,
      pkGoalsAgainstPer60: 6,
    });
  });
});
