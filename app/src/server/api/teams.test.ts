import { describe, expect, it } from "vitest";
import { round, seasonLabel } from "@/server/api/format";
import {
  buildTeamGameLog,
  gameResult,
  pairPercentage,
  parsePagination,
  parseSortDir,
  penaltyKillSummary,
  penaltySummary,
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
  it("rounds half to even on the decimal value", () => {
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

  it("penalty kill save % is a 0-1 fraction rounded to 1 dp", () => {
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

describe("gameResult", () => {
  it("counts overtime and shootout losses as OTL", () => {
    expect(gameResult(4, 3, "SO")).toBe("W");
    expect(gameResult(3, 4, "OT")).toBe("OTL");
    expect(gameResult(3, 4, "SO")).toBe("OTL");
    expect(gameResult(1, 4, "REG")).toBe("L");
  });
});

describe("buildTeamGameLog", () => {
  const split = { goalsFor: 2, goalsAgainst: 1, xGoalsFor: 1.234, xGoalsAgainst: 0.5, shotAttemptsFor: 30, shotAttemptsAgainst: 25 };
  const base = { gameDate: "2025-10-08", opponent: "MTL", isHome: true, homeScore: 3, awayScore: 4, periodType: "SO", gameState: "OFF" };

  it("merges situations per game and takes the result from the final score", () => {
    const log = buildTeamGameLog([
      { ...base, ...split, gameId: "1", situation: "all" },
      { ...base, ...split, gameId: "1", situation: "5on5", goalsFor: 1 },
      { ...base, ...split, gameId: "2", situation: "all", isHome: false, homeScore: null, awayScore: null, periodType: null, gameState: "FUT" },
    ]);
    expect(log).toHaveLength(2);
    expect(log[0]).toMatchObject({ teamScore: 3, opponentScore: 4, result: "OTL", periodType: "SO" });
    expect(log[0].all.xGoalsFor).toBe(1.23);
    expect(log[0].fiveOnFive?.goalsFor).toBe(1);
    expect(log[1]).toMatchObject({ teamScore: null, result: null, fiveOnFive: null });
  });
});

describe("penaltySummary", () => {
  const row = (team: string, drawn: number, taken: number) =>
    ({
      teamAbbreviation: team,
      iceTime: 3600 * 100,
      penaltiesAgainst: drawn,
      penaltiesFor: taken,
      penaltyMinutesAgainst: drawn * 2,
      penaltyMinutesFor: taken * 2,
    }) as TeamSeasonRow;
  const league = [row("AAA", 400, 300), row("BOS", 350, 380), row("CCC", 300, 320)];

  it("rates per 60 of all-situations time, ranked with 1 = best", () => {
    expect(penaltySummary(league, "BOS")).toEqual({
      drawn: 350,
      taken: 380,
      net: -30,
      drawnPer60: 3.5,
      takenPer60: 3.8,
      netPer60: -0.3,
      pimDrawn: 700,
      pimTaken: 760,
      drawnRank: 2,
      takenRank: 3,
      netRank: 3,
      leagueDrawnPer60: 3.5,
      leagueTakenPer60: 3.33,
    });
  });

  it("is null for a team without a row", () => {
    expect(penaltySummary(league, "XXX")).toBeNull();
  });
});
