import { describe, expect, it } from "vitest";
import { round, seasonLabel } from "@/server/api/format";
import {
  pairPercentage,
  parsePagination,
  parseSortDir,
  penaltyKillSummary,
  powerPlaySummary,
  rankBy,
  scoreStateBreakdown,
} from "@/server/api/teams";
import { HttpError } from "@/server/api/errors";
import type { teamSeasons } from "@/server/db/schema";

type TeamSeasonRow = typeof teamSeasons.$inferSelect;

function teamSeason(values: Partial<TeamSeasonRow>): TeamSeasonRow {
  return values as TeamSeasonRow;
}

describe("round", () => {
  it("rounds half to even like C# Math.Round(decimal)", () => {
    expect(round(0.125, 2)).toBe(0.12);
    expect(round(0.135, 2)).toBe(0.14);
    expect(round(2.5)).toBe(2);
    expect(round(-2.5)).toBe(-2);
    expect(round(29.94, 1)).toBe(29.9);
  });
});

describe("seasonLabel", () => {
  it("formats the two-digit end year", () => {
    expect(seasonLabel(2024)).toBe("2024-25");
    expect(seasonLabel(2099)).toBe("2099-00");
  });
});

describe("pairPercentage", () => {
  it("is the for share of for+against, 1 dp, null when empty", () => {
    expect(pairPercentage(3, 1)).toBe(75);
    expect(pairPercentage(1, 2)).toBe(33.3);
    expect(pairPercentage(0, 0)).toBeNull();
  });
});

describe("rankBy", () => {
  it("ranks highest first and keeps input order for ties", () => {
    const ranks = rankBy(
      [{ k: "A", v: 1 }, { k: "B", v: 5 }, { k: "C", v: 5 }],
      (x) => x.v,
      (x) => x.k,
    );
    expect([...ranks]).toEqual([["B", 1], ["C", 2], ["A", 3]]);
  });
});

describe("special teams summaries", () => {
  // 20086 s of PP time → 167 estimated opportunities (one per 120 s).
  const pp = teamSeason({
    iceTime: 20086.4,
    goalsFor: 50,
    xGoalsFor: 48.63,
    shotsOnGoalFor: 288,
    highDangerShotsFor: 70,
    highDangerGoalsFor: 32,
  });

  it("power play", () => {
    expect(powerPlaySummary(pp, 5)).toEqual({
      opportunities: 167,
      goals: 50,
      percentage: 29.9,
      xGoals: 48.6,
      xGoalsPer60: 8.72,
      shotsFor: 288,
      shootingPct: 17.4,
      highDangerChances: 70,
      highDangerGoals: 32,
      leagueRank: 5,
      iceTimeSeconds: 20086,
    });
  });

  it("penalty kill keeps the C# 0-1 save fraction rounded to 1 dp", () => {
    const pk = teamSeason({
      iceTime: 21600,
      goalsAgainst: 48,
      xGoalsAgainst: 50,
      shotsOnGoalAgainst: 300,
      highDangerShotsAgainst: 80,
      highDangerGoalsAgainst: 20,
    });
    const summary = penaltyKillSummary(pk, 20);
    expect(summary.timesShorthanded).toBe(180);
    expect(summary.percentage).toBe(73.3);
    expect(summary.xGoalsAgainstPer60).toBe(8.33);
    expect(summary.savePct).toBe(0.8);
  });

  it("missing stats give zeros and no rank", () => {
    expect(powerPlaySummary(undefined, 3).leagueRank).toBeNull();
    expect(penaltyKillSummary(undefined, 3).percentage).toBe(0);
  });
});

describe("scoreStateBreakdown", () => {
  const aggs = [
    { isFor: true, state: "leading", shotCount: 10, goalCount: 2, xGoals: 1.234 },
    { isFor: false, state: "leading", shotCount: 8, goalCount: 1, xGoals: 0.5 },
    { isFor: true, state: "tied", shotCount: 5, goalCount: 0, xGoals: 0.3 },
  ];

  it("filters by state", () => {
    expect(scoreStateBreakdown("leading", aggs, 100)).toEqual({
      state: "leading",
      shotsFor: 10,
      shotsAgainst: 8,
      goalsFor: 2,
      goalsAgainst: 1,
      xGoalsFor: 1.23,
      xGoalsAgainst: 0.5,
      shootingPct: 20,
      savePct: 87.5,
      xgDifferential: 0.73,
      timeSeconds: 100,
    });
  });

  it("total sums every state; no shots against gives null save %", () => {
    const total = scoreStateBreakdown(null, aggs.filter((a) => a.isFor), null);
    expect(total.state).toBe("total");
    expect(total.shotsFor).toBe(15);
    expect(total.savePct).toBeNull();
  });
});

describe("validation", () => {
  it("sortDir defaults to descending and rejects other values", () => {
    expect(parseSortDir(undefined)).toBe(true);
    expect(parseSortDir("ASC")).toBe(false);
    expect(() => parseSortDir("up")).toThrow(HttpError);
  });

  it("pagination needs both values in range", () => {
    expect(parsePagination(undefined, undefined)).toBeUndefined();
    expect(parsePagination(2, 50)).toEqual({ page: 2, pageSize: 50 });
    expect(() => parsePagination(1, undefined)).toThrow(HttpError);
    expect(() => parsePagination(0, 10)).toThrow(HttpError);
    expect(() => parsePagination(1, 101)).toThrow(HttpError);
  });
});
