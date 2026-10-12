import { describe, expect, it } from "vitest";
import { computeScoreState, finalPeriod, type GameInfo, type Goal } from "@/server/ingestion/score-state";

const regulation: GameInfo = { homeTeam: "TOR", awayTeam: "MTL", isPlayoffs: false, finalPeriod: 3 };
const total = (s: { leading: number; trailing: number; tied: number }) => s.leading + s.trailing + s.tied;

describe("computeScoreState", () => {
  it("counts a scoreless regulation game as all tied", () => {
    const { home, away } = computeScoreState([], regulation);
    expect(home).toEqual({ leading: 0, trailing: 0, tied: 3600 });
    expect(away).toEqual(home);
  });

  it("uses MoneyPuck's cumulative game time across periods", () => {
    // Home scores at 10:00 of P1 (600s), away ties at 05:00 of P2 (game time 1500s),
    // home wins it at 10:00 of P3 (game time 3000s).
    const goals: Goal[] = [
      { teamCode: "TOR", period: 1, gameSeconds: 600 },
      { teamCode: "MTL", period: 2, gameSeconds: 1500 },
      { teamCode: "TOR", period: 3, gameSeconds: 3000 },
    ];
    const { home, away } = computeScoreState(goals, regulation);
    expect(home).toEqual({ leading: 900 + 600, trailing: 0, tied: 600 + 1500 });
    expect(away).toEqual({ leading: 0, trailing: 1500, tied: 2100 });
    expect(total(home)).toBe(3600);
  });

  it("ends the game at a regular-season OT goal", () => {
    const goals: Goal[] = [{ teamCode: "MTL", period: 4, gameSeconds: 3600 + 125 }];
    const { home, away } = computeScoreState(goals, { ...regulation, finalPeriod: 4 });
    expect(home).toEqual({ leading: 0, trailing: 0, tied: 3725 });
    expect(away.tied).toBe(3725);
  });

  it("counts the full 5-minute OT before a shootout", () => {
    const goals: Goal[] = [
      { teamCode: "TOR", period: 1, gameSeconds: 100 },
      { teamCode: "MTL", period: 3, gameSeconds: 3500 },
    ];
    const { home } = computeScoreState(goals, { ...regulation, finalPeriod: 4 });
    expect(home).toEqual({ leading: 3400, trailing: 0, tied: 100 + 100 + 300 });
  });

  it("handles playoff multi-overtime (20-minute OT periods)", () => {
    const playoff: GameInfo = { ...regulation, isPlayoffs: true, finalPeriod: 5 };
    // Winner 7:00 into the second OT: game time 3600 + 1200 + 420.
    const { home, away } = computeScoreState([{ teamCode: "TOR", period: 5, gameSeconds: 5220 }], playoff);
    expect(home).toEqual({ leading: 0, trailing: 0, tied: 5220 });
    expect(away).toEqual(home);
  });

  it("is symmetric between the teams", () => {
    const goals: Goal[] = [
      { teamCode: "MTL", period: 1, gameSeconds: 59 },
      { teamCode: "MTL", period: 2, gameSeconds: 1300 },
      { teamCode: "TOR", period: 3, gameSeconds: 2500 },
    ];
    const { home, away } = computeScoreState(goals, regulation);
    expect(home.leading).toBe(away.trailing);
    expect(home.trailing).toBe(away.leading);
    expect(home.tied).toBe(away.tied);
    expect(total(home)).toBe(3600);
  });
});

describe("finalPeriod", () => {
  it("derives the last period played", () => {
    expect(finalPeriod(3, false, false, null)).toBe(3);
    expect(finalPeriod(3, false, false, "REG")).toBe(3);
    expect(finalPeriod(3, true, false, null)).toBe(4);
    expect(finalPeriod(4, false, true, null)).toBe(4);
    expect(finalPeriod(3, false, false, "SO")).toBe(4);
    expect(finalPeriod(6, true, false, "OT")).toBe(6);
  });
});
