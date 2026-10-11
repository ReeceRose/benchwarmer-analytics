import { describe, expect, it } from "vitest";
import {
  calculateDeserveToWin,
  monteCarloByPrefix,
  mulberry32,
  poissonWinProbability,
  type DeserveToWinShot,
} from "@/server/api/deserve-to-win";
import {
  boxscoreSkaters,
  buildGameStats,
  findGwgIndex,
  goalieRecentForm,
  headToHeadRecord,
  seasonFromGameId,
  seasonSeriesText,
  teamName,
} from "@/server/api/games";
import type { NhlBoxscore, NhlClubScheduleGame } from "@/server/api/nhl-client";

describe("poissonWinProbability", () => {
  it("is 0.5 with no xG and symmetric", () => {
    expect(poissonWinProbability(0, 0)).toBe(0.5);
    expect(poissonWinProbability(2, 2)).toBeCloseTo(0.5, 6);
    expect(poissonWinProbability(3, 1) + poissonWinProbability(1, 3)).toBeCloseTo(1, 6);
  });

  it("matches a hand-computed value", () => {
    // Home 1 xG vs away 0 xG: P(home ≥ 1) + 0.5·P(home = 0) = (1 - e^-1) + 0.5·e^-1
    expect(poissonWinProbability(1, 0)).toBeCloseTo(1 - 0.5 * Math.exp(-1), 10);
  });
});

function shot(isHomeTeam: boolean, xGoal: number, extra: Partial<DeserveToWinShot> = {}): DeserveToWinShot {
  return {
    gameTimeSeconds: 0,
    eventId: 0,
    period: 1,
    isHomeTeam,
    xGoal,
    isGoal: false,
    shotOnEmptyNet: false,
    shotRebound: false,
    shotGeneratedRebound: false,
    ...extra,
  };
}

describe("monteCarloByPrefix", () => {
  it("certain goals are always scored; ties split for OT", () => {
    const result = monteCarloByPrefix([shot(true, 1), shot(false, 1)], mulberry32(1), 100);
    expect(result[0]).toEqual({ homeWinPct: 1, homeOtWinPct: 0, awayOtWinPct: 0 });
    expect(result[1]).toEqual({ homeWinPct: 0.5, homeOtWinPct: 0.5, awayOtWinPct: 0.5 });
  });

  it("skips rebounds after a simulated goal that generated a rebound", () => {
    const shots = [
      shot(true, 1, { shotGeneratedRebound: true }),
      shot(true, 1, { shotRebound: true }),
      shot(false, 1),
      shot(false, 1, { shotRebound: true }),
    ];
    // Home: 1 (rebound skipped). Away: 2 (the away rebound follows a shot
    // that didn't generate one, so it counts). Away wins every simulation.
    const result = monteCarloByPrefix(shots, mulberry32(1), 50);
    expect(result.map((r) => r.homeWinPct)).toEqual([1, 1, 0.5, 0]);
  });

  it("converges to the shot probabilities", () => {
    const [result] = monteCarloByPrefix([shot(true, 0.3)], mulberry32(42), 10_000);
    // Home wins when the shot goes in (0.3), else a 0-0 tie split 50/50.
    expect(result.homeWinPct).toBeCloseTo(0.3 + 0.7 / 2, 1);
  });
});

describe("calculateDeserveToWin", () => {
  const shots = [
    shot(false, 0.2, { gameTimeSeconds: 300, eventId: 5 }),
    shot(true, 0.1, { gameTimeSeconds: 100, eventId: 2, isGoal: true }),
    shot(true, 0.9, { gameTimeSeconds: 500, eventId: 9, shotOnEmptyNet: true }),
  ];

  it("drops empty-net shots, orders by time and accumulates xG", () => {
    const result = calculateDeserveToWin("2024020001", "TOR", "MTL", shots, 1, 0);
    expect(result.progression.map((p) => [p.shotNumber, p.gameTimeSeconds, p.isHomeShot, p.wasGoal])).toEqual([
      [1, 100, true, true],
      [2, 300, false, null],
    ]);
    expect(result.homeSummary.totalXG).toBeCloseTo(0.1);
    expect(result.awaySummary.totalXG).toBeCloseTo(0.2);
    expect(result.homeSummary.shotsExcludingEmptyNet).toBe(1);
    expect(result.awaySummary.poissonWinPct).toBeCloseTo(1 - result.homeSummary.poissonWinPct, 12);
  });

  it("is deterministic per game", () => {
    const a = calculateDeserveToWin("2024020001", "TOR", "MTL", shots, 1, 0);
    const b = calculateDeserveToWin("2024020001", "TOR", "MTL", shots, 1, 0);
    expect(a).toEqual(b);
  });

  it("no shots: even odds", () => {
    const result = calculateDeserveToWin("x", "A", "B", [], 0, 0);
    expect(result.homeSummary.monteCarloWinPct).toBe(0.5);
    expect(result.homeSummary.monteCarloOTWinPct).toBe(0.25);
    expect(result.progression).toEqual([]);
  });
});

describe("findGwgIndex", () => {
  const goal = (isHomeGoal: boolean, homeScoreAfter: number, awayScoreAfter: number) => ({ isHomeGoal, homeScoreAfter, awayScoreAfter });

  it("is the winner's goal that went one past the loser's final total", () => {
    // 1-0 H, 1-1 A, 2-1 H, 3-1 H, 3-2 A → final 3-2: the 3rd home goal
    const goals = [goal(true, 1, 0), goal(false, 1, 1), goal(true, 2, 1), goal(true, 3, 1), goal(false, 3, 2)];
    expect(findGwgIndex(goals, 3, 2)).toBe(3);
    expect(findGwgIndex(goals.slice(0, 2), 1, 1)).toBeNull();
  });
});

function scheduleGame(home: string, homeScore: number, away: string, awayScore: number, extra: Partial<NhlClubScheduleGame> = {}) {
  return {
    gameState: "OFF",
    gameType: 2,
    homeTeam: { abbrev: home, score: homeScore },
    awayTeam: { abbrev: away, score: awayScore },
    ...extra,
  } as NhlClubScheduleGame;
}

describe("season series", () => {
  const schedule = [
    scheduleGame("TOR", 3, "MTL", 2, { gameDate: "2024-10-09" }),
    scheduleGame("MTL", 4, "TOR", 1, { gameDate: "2024-11-09", periodDescriptor: { periodType: "OT" } }),
    scheduleGame("TOR", 5, "MTL", 0, { gameDate: "2025-01-18" }),
    scheduleGame("TOR", 2, "BOS", 1),
    scheduleGame("TOR", 2, "MTL", 1, { gameType: 1 }),
    scheduleGame("TOR", 0, "MTL", 0, { gameState: "FUT" }),
  ];

  it("counts final regular-season meetings from the home team's view", () => {
    expect(seasonSeriesText({ home: "TOR", away: "MTL", season: 2024 }, schedule)).toBe("TOR leads 2-1");
    expect(seasonSeriesText({ home: "TOR", away: "OTT", season: 2024 }, schedule)).toBe("");
    expect(seasonSeriesText({ home: "TOR", away: "MTL", season: 2024 }, undefined)).toBe("");
  });

  it("head-to-head record and last five", () => {
    const meetings = schedule.slice(0, 3).reverse();
    const h2h = headToHeadRecord(meetings, "TOR", "MTL");
    expect(h2h.season).toEqual({ homeWins: 2, awayWins: 1, overtimeLosses: 1 });
    expect(h2h.lastFive[1]).toEqual({ date: "2024-11-09", score: "MTL 4 - TOR 1", winner: "MTL", overtimeType: "OT" });
  });
});

describe("helpers", () => {
  it("seasonFromGameId", () => {
    expect(seasonFromGameId("2024020500")).toBe(2024);
  });

  it("teamName is case-insensitive", () => {
    expect(teamName("tor")).toBe("Toronto Maple Leafs");
    expect(teamName("XXX")).toBeNull();
  });

  it("game stats per team and period", () => {
    const base = { gameId: "g", homeTeamCode: "TOR", awayTeamCode: "MTL", shotWasOnGoal: true, shotDistance: 30 };
    const stats = buildGameStats([
      { ...base, period: 1, isHomeTeam: true, isGoal: true, xGoal: 0.25 },
      { ...base, period: 1, isHomeTeam: false, isGoal: false, xGoal: 0.1, shotDistance: null },
      { ...base, period: 2, isHomeTeam: true, isGoal: false, xGoal: 0.05, shotDistance: 20 },
    ]);
    expect(stats).toHaveLength(1);
    expect(stats[0].home).toMatchObject({ totalShots: 2, goals: 1, expectedGoals: 0.3, goalsVsXgDiff: 0.7, avgShotDistance: 25, highDangerChances: 1, lowDangerChances: 1 });
    expect(stats[0].away).toMatchObject({ totalShots: 1, avgShotDistance: 0, mediumDangerChances: 1 });
    expect(stats[0].periods.map((p) => [p.period, p.homeShots, p.awayShots])).toEqual([[1, 1, 1], [2, 1, 0]]);
  });

  it("boxscore skaters sort by points, goals, shots", () => {
    const rows = boxscoreSkaters({
      forwards: [{ playerId: 1, points: 1, goals: 0, sog: 5 }, { playerId: 2, points: 2, goals: 1 }],
      defense: [{ playerId: 3, points: 1, goals: 1, sog: 1, faceoffWinningPctg: 0.5 }],
    });
    expect(rows.map((r) => r.playerId)).toEqual([2, 3, 1]);
    expect(rows[1].faceoffPct).toBe(50);
  });

  it("goalie recent form sums saves/shots strings across games", () => {
    const box = (id: number, saveShots: string, goalsAgainst: number): NhlBoxscore => ({
      id,
      homeTeam: { abbrev: "TOR" },
      playerByGameStats: { homeTeam: { goalies: [{ playerId: 31, name: { default: "J. Woll" }, saveShotsAgainst: saveShots, goalsAgainst }] } },
    });
    const games = [{ id: 1 }, { id: 2 }, { id: 3 }] as NhlClubScheduleGame[];
    const boxes = new Map([["1", box(1, "28/30", 2)], ["2", box(2, "20/20", 0)], ["3", box(3, "bad", 9)]]);
    expect(goalieRecentForm("TOR", games, boxes)).toEqual([
      { playerId: 31, name: "J. Woll", gamesPlayed: 2, savePct: 0.96, shotsAgainst: 50, goalsAgainst: 2 },
    ]);
  });
});
