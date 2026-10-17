import { describe, expect, it } from "vitest";
import { detectGoal } from "@/lib/goal-alert";
import type { GameGoal, GameSummary } from "@/types";

function goal(teamCode: string, scorerId: number, timeInPeriod: string): GameGoal {
  return { period: 2, timeInPeriod, scorerName: `P${scorerId}`, scorerId, teamCode, strength: "ev", assists: [] };
}

function game(away: number, home: number, goals: GameGoal[] = [], gameId = "2026020121"): GameSummary {
  const team = (teamCode: string, n: number) => ({ teamCode, goals: n }) as GameSummary["home"];
  return { gameId, away: team("NJD", away), home: team("WSH", home), goals } as GameSummary;
}

describe("detectGoal", () => {
  it("needs a previous poll of the same game", () => {
    expect(detectGoal(undefined, game(1, 1))).toBeNull();
    expect(detectGoal(game(0, 0, [], "1"), game(1, 0, [], "2"))).toBeNull();
  });

  it("ignores unchanged and overturned scores", () => {
    expect(detectGoal(game(1, 1), game(1, 1))).toBeNull();
    expect(detectGoal(game(1, 2), game(1, 1))).toBeNull();
  });

  it("names the new scorer", () => {
    const g = goal("WSH", 8, "01:16");
    expect(detectGoal(game(1, 1), game(1, 2, [g]))).toEqual({ side: "home", teamCode: "WSH", goal: g });
  });

  it("leaves the scorer out while the goal list lags the score", () => {
    const old = goal("WSH", 8, "16:42");
    expect(detectGoal(game(1, 1, [old]), game(1, 2, [old]))).toEqual({ side: "home", teamCode: "WSH", goal: null });
  });

  it("picks the latest goal when both teams scored between polls", () => {
    const a = goal("WSH", 8, "01:16");
    const b = goal("NJD", 9, "02:30");
    expect(detectGoal(game(0, 0), game(1, 1, [a, b]))?.teamCode).toBe("NJD");
  });
});
