import { describe, expect, it } from "vitest";
import { GoalieTable, XGA_PER_GAME, type GoalieGame } from "@/server/projections/goalies";
import { dayBefore, restGap } from "@/lib/projections/ratings";

const row = (season: number, gameId: string, team: string, goalie: number, shots: number, xga: number, goals: number): GoalieGame => ({
  season,
  gameId,
  team,
  goalie,
  shots,
  xga,
  goals,
});

describe("GoalieTable", () => {
  it("credits the start to the goalie who faced the most shots and shrinks talent toward average", () => {
    const table = new GoalieTable({ decay: 1, shrinkXg: 10 });
    table.addGame([row(2025, "1", "AAA", 1, 25, 3, 1), row(2025, "1", "AAA", 2, 5, 1, 2), row(2025, "1", "BBB", 3, 30, 4, 4)]);
    // Goalie 1: 2 saved above expected on 3 xG, shrunk by 10 xG.
    expect(table.talent(1)).toBeCloseTo(2 / 13);
    // Only goalie 1 started for AAA, so his talent is the team's.
    expect(table.team("AAA")).toBeCloseTo((2 / 13) * XGA_PER_GAME);
    expect(table.team("BBB")).toBe(0);
    expect(table.team("CCC")).toBe(0);
  });

  it("decays records and clears starts at a new season", () => {
    const table = new GoalieTable({ decay: 0.5, shrinkXg: 0 });
    table.addGame([row(2024, "1", "AAA", 1, 30, 4, 2)]);
    table.addGame([row(2025, "2", "AAA", 1, 30, 2, 2)]);
    // (2 × 0.5 + 0) / (4 × 0.5 + 2)
    expect(table.talent(1)).toBeCloseTo(1 / 4);
    table.addGame([row(2026, "3", "BBB", 1, 30, 2, 2)]);
    expect(table.team("AAA")).toBe(0);
    expect(table.team("BBB")).toBeCloseTo(table.talent(1) * XGA_PER_GAME);
  });
});

describe("rest", () => {
  it("favours the rested team", () => {
    expect(restGap(false, true)).toBe(1);
    expect(restGap(true, false)).toBe(-1);
    expect(restGap(true, true)).toBe(0);
  });

  it("finds the day before across month and year ends", () => {
    expect(dayBefore("2026-03-01")).toBe("2026-02-28");
    expect(dayBefore("2027-01-01")).toBe("2026-12-31");
  });
});
