import { describe, expect, it } from "vitest";
import { shotTypeRows, shotTypeTotals } from "@/server/api/shot-types";

describe("shot types", () => {
  it("sums rows, folds rare types into other, and compares with the league", () => {
    const own = shotTypeTotals([
      { shotsOnNetWrist: 8, goalsWrist: 1, shotsOnNetPoke: 1, goalsPoke: 1 },
      { shotsOnNetWrist: 2, goalsWrist: 1, shotsOnNetSlap: 0 },
    ]);
    const league = shotTypeTotals([{ shotsOnNetWrist: 1000, goalsWrist: 100 }]);
    expect(shotTypeRows(own, league)).toEqual([
      { type: "wrist", label: "Wrist", shots: 10, goals: 2, shootingPct: 0.2, leagueShootingPct: 0.1 },
      { type: "other", label: "Other", shots: 1, goals: 1, shootingPct: 1, leagueShootingPct: null },
    ]);
  });
});
