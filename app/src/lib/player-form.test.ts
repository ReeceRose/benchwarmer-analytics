import { describe, expect, it } from "vitest";
import {
  GOALIE_METRICS,
  SKATER_METRICS,
  rollingMetric,
  scoringBreakdown,
  stretches,
  venueSplits,
} from "@/lib/player-form";
import type { GoalieGameLogEntry, SkaterGameLogEntry } from "@/types";

const base = {
  gameDate: "2025-10-10",
  team: "EDM",
  opponent: "CGY",
  isHome: true,
  teamScore: 3,
  opponentScore: 2,
  periodType: "REG",
  result: "W" as const,
  toiSeconds: 1200,
};

function skater(gameId: string, points: number, goals: number, extra: Partial<SkaterGameLogEntry> = {}): SkaterGameLogEntry {
  return {
    ...base,
    gameId,
    goals,
    assists: points - goals,
    points,
    plusMinus: 0,
    shots: 3,
    powerPlayPoints: 0,
    xGoals: 0.5,
    gameScore: null,
    gameScoreScoring: null,
    gameScoreOnIce: null,
    gameScoreOther: null,
    ...extra,
  };
}

function goalie(gameId: string, shotsAgainst: number, goalsAgainst: number, gsax: number | null): GoalieGameLogEntry {
  return {
    ...base,
    gameId,
    toiSeconds: 3600,
    started: true,
    decision: "W",
    shotsAgainst,
    goalsAgainst,
    xGoalsAgainst: gsax === null ? null : goalsAgainst + gsax,
    goalsSavedAboveExpected: gsax,
  };
}

describe("rollingMetric", () => {
  it("averages a trailing window and waits for minGames", () => {
    const games = [skater("1", 2, 1), skater("2", 0, 0), skater("3", 1, 0), skater("4", 3, 2)];
    const points = rollingMetric(games, SKATER_METRICS.points, 2, 2);
    expect(points.map((p) => [p.gameNum, p.windowGames, p.value])).toEqual([
      [1, 1, null],
      [2, 2, 1],
      [3, 2, 0.5],
      [4, 2, 2],
    ]);
  });

  it("skips games without xG instead of counting them as zero", () => {
    const games = [skater("1", 0, 0, { xGoals: 1 }), skater("2", 0, 0, { xGoals: null })];
    expect(SKATER_METRICS.xGoals(games)).toBe(1);
    expect(SKATER_METRICS.xGoals([games[1]])).toBeNull();
  });
});

describe("goalie metrics", () => {
  const games = [goalie("1", 30, 1, 1.5), goalie("2", 20, 4, -2), goalie("3", 25, 2, null)];

  it("pools save percentage over the window", () => {
    expect(GOALIE_METRICS.savePct(games)).toBeCloseTo(1 - 7 / 75);
  });

  it("averages GSAx over games with xG and computes GAA from ice time", () => {
    expect(GOALIE_METRICS.gsaxPerGame(games)).toBeCloseTo(-0.25);
    expect(GOALIE_METRICS.goalsAgainstAverage(games)).toBeCloseTo(7 / 3);
  });
});

describe("stretches and splits", () => {
  const games = [skater("1", 1, 0), skater("2", 2, 1, { isHome: false }), skater("3", 0, 0)];

  it("only lists stretches shorter than the season", () => {
    expect(stretches(games, [2, 5]).map((s) => [s.label, s.games.length])).toEqual([
      ["Last 2", 2],
      ["Season", 3],
    ]);
  });

  it("splits by venue", () => {
    expect(venueSplits(games).map((s) => s.games.length)).toEqual([2, 1]);
  });
});

describe("scoringBreakdown", () => {
  it("counts power-play points, multi-point and pointless games", () => {
    const games = [skater("1", 2, 1, { powerPlayPoints: 1 }), skater("2", 0, 0), skater("3", 3, 1, { powerPlayPoints: 2 })];
    expect(scoringBreakdown(games)).toEqual({
      points: 5,
      powerPlayPoints: 3,
      otherPoints: 2,
      multiPointGames: 2,
      pointlessGames: 1,
      games: 3,
    });
  });
});
