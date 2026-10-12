import { describe, expect, it } from "vitest";
import { ageAsOfSept15, breakoutScore, percentileThresholds, rookieScore, seasonTrend, thresholds } from "@/server/api/stats";

const skater = { goals: 10, assists: 15, shots: 120, iceTimeSeconds: 60_000, expectedGoals: 14, corsiForPct: 55 };

describe("percentileThresholds", () => {
  it("interpolates linearly between ranks and rounds to 3 dp", () => {
    const values = [0, 1, 2, 3, 4];
    const t = percentileThresholds(values);
    expect(t).toHaveLength(99);
    expect(t[0]).toBe(0.04); // p1: rank 0.04
    expect(t[49]).toBe(2); // p50: rank 2 exactly
    expect(t[98]).toBe(3.96);
  });

  it("handles a single value", () => {
    expect(new Set(percentileThresholds([0.5]))).toEqual(new Set([0.5]));
  });
});

describe("thresholds", () => {
  it("uses full thresholds from the season midpoint on", () => {
    const full = { minIceTime: 30_000, minGoals: 10, minLineToi: 18_000, minGoalieGames: 10 };
    expect(thresholds("5on5")).toEqual(full);
    expect(thresholds("5on5", 41)).toEqual(full);
    expect(thresholds("5on5", 82)).toEqual(full);
  });

  it("scales with games played before the midpoint", () => {
    // progress = 20/41
    expect(thresholds("5on5", 20)).toEqual({ minIceTime: 14_634, minGoals: 5, minLineToi: 8_780, minGoalieGames: 5 });
  });

  it("never drops below the floors", () => {
    expect(thresholds("5on5", 0)).toEqual({ minIceTime: 3_000, minGoals: 2, minLineToi: 1_200, minGoalieGames: 2 });
    expect(thresholds("5on4", 3)).toEqual({ minIceTime: 300, minGoals: 1, minLineToi: 300, minGoalieGames: 2 });
  });
});

describe("breakoutScore", () => {
  it("adds xG shortfall, CF% bonus and shot-rate bonus", () => {
    // shots/60 = 120/60000*3600 = 7.2 → (7.2-7)/3 = 0.0667; xG diff 4; CF bonus 0.5
    expect(breakoutScore(skater)).toBe(4.57);
  });

  it("defaults missing xG to 0 and CF% to 50", () => {
    expect(breakoutScore({ ...skater, expectedGoals: null, corsiForPct: null })).toBe(-9.93);
  });
});

describe("rookieScore", () => {
  it("weights production, boosts defensemen and younger players", () => {
    // forward: 25*2 + (-4)*1.5 + 1 + 2.4 + 0 = 47.4
    expect(rookieScore(skater, "C", 22)).toBe(47.4);
    // defenseman, age 20: 50*1.3 - 6*1.3 + 1 + 2.4 + 4 = 64.6
    expect(rookieScore(skater, "D", 20)).toBe(64.6);
  });
});

describe("ageAsOfSept15", () => {
  it("counts a birthday on Sept 15 but not after", () => {
    expect(ageAsOfSept15("2004-09-15", 2024)).toBe(20);
    expect(ageAsOfSept15("2004-09-16", 2024)).toBe(19);
    expect(ageAsOfSept15("2004-01-01", 2024)).toBe(20);
  });
});

describe("seasonTrend", () => {
  it("normalizes Corsi stored as a ratio and computes per-game rates", () => {
    const trend = seasonTrend(
      { season: 2024, teamGames: 2624, goals: 8000, shots: 70000, xGoals: 7700.44, weightedCorsi: 0.5 * 5_000_000, iceTime: 5_000_000 },
      { players: 900, playerGames: 45000, assists: 13000, iceTimeSeconds: 44_000_000 },
    );
    expect(trend).toEqual({
      season: 2024,
      totalPlayers: 900,
      totalGamesPlayed: 45000,
      totalGoals: 8000,
      totalAssists: 13000,
      totalShots: 70000,
      totalExpectedGoals: 7700.4,
      avgCorsiPct: 50,
      avgGoalsPerGame: 3.05,
      avgAssistsPerGame: 4.95,
      avgToiPerGame: 977.8,
      avgXgPer60: 5.54,
    });
  });

  it("keeps Corsi already stored as a percentage", () => {
    const trend = seasonTrend(
      { season: 2010, teamGames: 0, goals: 0, shots: 0, xGoals: 0, weightedCorsi: 51.25 * 10, iceTime: 10 },
      undefined,
    );
    expect(trend.avgCorsiPct).toBe(51.2);
    expect(trend.avgGoalsPerGame).toBe(0);
    expect(trend.totalPlayers).toBe(0);
  });
});
