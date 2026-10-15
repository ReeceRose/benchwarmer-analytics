import { describe, expect, it } from "vitest";
import { gameScore, type GameScoreInputs } from "@/server/api/game-score";

const zero: GameScoreInputs = {
  goals: 0, primaryAssists: 0, secondaryAssists: 0, shotsOnGoal: 0, blocks: 0, penaltiesDrawn: 0, penaltiesTaken: 0,
  faceoffWins: 0, faceoffLosses: 0, onIceAttemptsFor5v5: 0, onIceAttemptsAgainst5v5: 0, onIceGoalsFor5v5: 0, onIceGoalsAgainst5v5: 0,
};

describe("gameScore", () => {
  it("reproduces MoneyPuck's season Game Score (Matthews 2024: 86.3)", () => {
    // Individual stats from the "all" row, on-ice stats from the "5on5" row.
    const result = gameScore({
      goals: 33, primaryAssists: 27, secondaryAssists: 18, shotsOnGoal: 261, blocks: 89,
      penaltiesDrawn: 15, penaltiesTaken: 9, faceoffWins: 695, faceoffLosses: 528,
      onIceAttemptsFor5v5: 1007, onIceAttemptsAgainst5v5: 926, onIceGoalsFor5v5: 51, onIceGoalsAgainst5v5: 37,
    });
    expect(result.total).toBeCloseTo(86.3, 1);
  });

  it("splits into scoring, 5v5 on-ice and other parts", () => {
    const result = gameScore({
      ...zero, goals: 1, primaryAssists: 1, shotsOnGoal: 4, blocks: 2, penaltiesTaken: 1,
      onIceAttemptsFor5v5: 10, onIceAttemptsAgainst5v5: 14, onIceGoalsAgainst5v5: 1,
    });
    expect(result).toEqual({ scoring: 1.75, onIce: -0.35, other: -0.05, total: 1.35 });
  });

  it("is zero for an empty game", () => {
    expect(gameScore(zero)).toEqual({ total: 0, scoring: 0, onIce: 0, other: 0 });
  });
});
