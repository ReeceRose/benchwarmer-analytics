import { describe, expect, it } from "vitest";
import { goalieRestSplits, restRows, situationRecord } from "@/server/api/situations";

const tally = (r: Record<string, unknown>) => ({ wins: Number(r.w ?? 0), losses: Number(r.l ?? 0), otLosses: Number(r.o ?? 0), ties: 0 });

describe("situationRecord", () => {
  it("ranks by points % among teams with games and pools the league", () => {
    const rows = [
      { teamId: 1, w: 3, l: 1, o: 0 }, // .750
      { teamId: 2, w: 1, l: 1, o: 2 }, // .500
      { teamId: 3, w: 0, l: 0, o: 0 }, // no games: not ranked
    ];
    expect(situationRecord("k", "Label", 2, rows, tally)).toEqual({
      key: "k", label: "Label", gamesPlayed: 4, wins: 1, losses: 1, otLosses: 2,
      pointsPct: 0.5, rank: 2, leaguePointsPct: 0.625,
    });
    expect(situationRecord("k", "Label", 3, rows, tally)).toMatchObject({ gamesPlayed: 0, pointsPct: null, rank: null });
  });

  it("ties share a rank", () => {
    const rows = [{ teamId: 1, w: 1 }, { teamId: 2, w: 1 }, { teamId: 3, l: 1 }];
    expect(situationRecord("k", "L", 2, rows, tally).rank).toBe(1);
    expect(situationRecord("k", "L", 3, rows, tally).rank).toBe(3);
  });
});

describe("restRows", () => {
  it("folds three and more days of rest together, per team", () => {
    const rows = restRows([
      { teamId: 10, daysRest: 0, wins: 1, losses: 2, otLosses: 0, ties: 0 },
      { teamId: 10, daysRest: 3, wins: 2, losses: 0, otLosses: 1, ties: 0 },
      { teamId: 10, daysRest: 5, wins: 1, losses: 1, otLosses: 0, ties: 0 },
    ]);
    expect(rows).toEqual([{ teamId: 10, wins0: 1, losses0: 2, otLosses0: 0, ties0: 0, wins3: 3, losses3: 1, otLosses3: 1, ties3: 0 }]);
  });
});

describe("goalieRestSplits", () => {
  it("weights the league by games and leaves empty splits blank", () => {
    const own = { gamesPlayedDaysRest1: 10, savePctDaysRest1: 0.92, gamesPlayedDaysRest0: 0, savePctDaysRest0: null };
    const other = { gamesPlayedDaysRest1: 30, savePctDaysRest1: 0.9 };
    const splits = goalieRestSplits(own, [own, other]);
    expect(splits[0]).toMatchObject({ label: "Back-to-back", gamesPlayed: 0, savePct: null, leagueSavePct: null });
    // (10 × .92 + 30 × .90) / 40 = .905
    expect(splits[1]).toMatchObject({ gamesPlayed: 10, savePct: 0.92, leagueSavePct: 0.905 });
    expect(splits).toHaveLength(5);
  });
});
