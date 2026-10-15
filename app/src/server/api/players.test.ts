import { describe, expect, it } from "vitest";
import {
  advancedRates,
  backToBackSplits,
  buildPlayerGameLog,
  estimateGameDate,
  goaliePerGameStats,
  latestSkaterStat,
  markBackToBacks,
  rollingSummary,
  workloadTrend,
  workloadWindow,
  type GoalieShot,
} from "@/server/api/players";
import { dayNumber, MIN_DATE } from "@/server/api/format";
import type { skaterSeasonAdvanced, skaterSeasons } from "@/server/db/schema";

describe("rollingSummary", () => {
  const games = [
    { gameId: "3", goals: 2, shots: 5, expectedGoals: 0.8, shootingPct: 40 },
    { gameId: "2", goals: 1, shots: 3, expectedGoals: 0.33, shootingPct: 33.3 },
    { gameId: "1", goals: 0, shots: 4, expectedGoals: 0.2, shootingPct: 0 },
  ];

  it("compares recent goals per game with the season rate", () => {
    const summary = rollingSummary(games, { gamesPlayed: 40, goals: 16, shots: 120, expectedGoals: 14.5 });
    expect(summary).toEqual({
      seasonGoalsPerGame: 0.4,
      seasonShotsPerGame: 3,
      seasonXgPerGame: 0.36,
      seasonShootingPct: 13.3,
      rollingGoalsPerGame: 1,
      rollingShotsPerGame: 4,
      rollingXgPerGame: 0.44,
      rollingShootingPct: 25,
      trend: "hot",
    });
  });

  it("is cold below 80% and neutral without a season rate", () => {
    expect(rollingSummary(games, { gamesPlayed: 10, goals: 20, shots: 50, expectedGoals: null }).trend).toBe("cold");
    expect(rollingSummary(games, undefined).trend).toBe("neutral");
    expect(rollingSummary([], undefined).rollingGoalsPerGame).toBe(0);
  });
});

describe("goalie workload", () => {
  const shot = (gameId: string, isGoal: boolean, xGoal: number, shotWasOnGoal = true): GoalieShot => ({
    gameId,
    isGoal,
    shotWasOnGoal,
    xGoal,
    // Away team shooting: the goalie is home.
    isHomeTeam: false,
    homeTeamCode: "NYR",
    awayTeamCode: "BOS",
  });

  const shots = [
    shot("2024020003", false, 0.1),
    shot("2024020003", true, 0.3),
    shot("2024020003", false, 0.5, false),
    shot("2024020002", false, 0.2),
    shot("2024020001", true, 0.4),
  ];
  const dates = new Map([
    ["2024020003", "2024-10-12"],
    ["2024020002", "2024-10-11"],
    ["2024020001", "2024-10-08"],
  ]);

  it("aggregates shots on goal per game, newest first", () => {
    const games = goaliePerGameStats(shots, dates);
    expect(games.map((g) => g.gameId)).toEqual(["2024020003", "2024020002", "2024020001"]);
    expect(games[0]).toMatchObject({
      opponent: "BOS",
      isHome: true,
      shotsAgainst: 2,
      goalsAgainst: 1,
      savePercentage: 0.5,
      expectedGoalsAgainst: 0.4,
      goalsSavedAboveExpected: -0.6,
    });
  });

  it("marks back-to-backs and day gaps; the oldest game has none", () => {
    const games = goaliePerGameStats(shots, dates);
    markBackToBacks(games);
    expect(games.map((g) => [g.isBackToBack, g.daysSincePreviousGame])).toEqual([
      [true, 1],
      [false, 3],
      [false, null],
    ]);
    const splits = backToBackSplits(games);
    expect(splits.backToBackGames).toBe(1);
    expect(splits.nonBackToBackGames).toBe(2);
    expect(splits.backToBackSavePercentage).toBe(0.5);
    expect(splits.nonBackToBackGAA).toBe(0.5);
  });

  it("windows count games within N days of the reference date", () => {
    const games = goaliePerGameStats(shots, dates);
    const window = workloadWindow(games, "2024-10-12", 3);
    expect(window.gamesPlayed).toBe(2);
    expect(window.gamesPerWeek).toBe(4.67);
    expect(window.avgShotsAgainstPerGame).toBe(1.5);
    expect(window.isHighWorkload).toBe(true);
    expect(workloadWindow(games, "2025-01-01", 7).gamesPlayed).toBe(0);
  });

  it("unknown dates sort last as MIN_DATE and stay out of windows", () => {
    const games = goaliePerGameStats(shots, new Map([["2024020001", "2024-10-08"]]));
    expect(games[0].gameId).toBe("2024020001");
    expect(games[2].gameDate).toBe(MIN_DATE);
    expect(workloadWindow(games, "2024-10-08", 30).gamesPlayed).toBe(1);
  });

  it("trend", () => {
    expect(workloadTrend({ gamesPerWeek: 3, avgShotsAgainstPerGame: 31 })).toBe("heavy");
    expect(workloadTrend({ gamesPerWeek: 3.5, avgShotsAgainstPerGame: 25 })).toBe("moderate");
    expect(workloadTrend({ gamesPerWeek: 2, avgShotsAgainstPerGame: 40 })).toBe("light");
  });

  it("estimates missing game dates across the season", () => {
    expect(estimateGameDate("2024020001", 2024)).toBe("2024-10-01");
    expect(estimateGameDate("2024021312", 2024)).toBe("2025-04-16");
    expect(estimateGameDate("20656", 2024)).toBe("2025-01-07");
    expect(estimateGameDate("x", 2024)).toBeUndefined();
  });

  it("dayNumber counts days since 0001-01-01", () => {
    expect(dayNumber("0001-01-01")).toBe(0);
    expect(dayNumber("2024-01-01")).toBe(738885);
  });
});

describe("advancedRates", () => {
  it("computes zone starts (incl. neutral), faceoff and D-zone giveaway rates", () => {
    const adv = {
      ifoZoneShiftStarts: 100,
      ifdZoneShiftStarts: 50,
      ifNeutralZoneShiftStarts: 50,
      faceoffsWon: 300,
      faceoffsLost: 200,
      ifGiveaways: 30,
      ifdZoneGiveaways: 10,
    } as typeof skaterSeasonAdvanced.$inferSelect;
    expect(advancedRates(adv)).toEqual({ oZoneShiftPct: 50, dZoneShiftPct: 25, faceoffPct: 60, giveawayDZonePct: 33.3 });
    expect(advancedRates(undefined)).toEqual({ oZoneShiftPct: null, dZoneShiftPct: null, faceoffPct: null, giveawayDZonePct: null });
  });
});

describe("latestSkaterStat", () => {
  type Row = typeof skaterSeasons.$inferSelect;
  const row = (season: number, isPlayoffs: boolean, expectedGoals: number | null) =>
    ({ season, isPlayoffs, expectedGoals }) as Row;

  it("prefers regular-season rows with xG, then the newest season", () => {
    const rows = [row(2024, false, null), row(2024, true, 1), row(2023, false, 5), row(2022, false, 3)];
    expect(latestSkaterStat(rows)).toBe(rows[2]);
  });

  it("falls back to the first row", () => {
    const rows = [row(2024, true, 1)];
    expect(latestSkaterStat(rows)).toBe(rows[0]);
  });
});

describe("buildPlayerGameLog", () => {
  const log = [
    { gameId: 2026020060, gameDate: "2026-10-12", teamAbbrev: "TOR", opponentAbbrev: "MTL", homeRoadFlag: "R", toi: "18:30", goals: 1, assists: 1, points: 2, shots: 4 },
    { gameId: 2026020040, gameDate: "2026-10-10", teamAbbrev: "TOR", opponentAbbrev: "BOS", homeRoadFlag: "H", toi: "20:05", shots: 2 },
  ];
  const scores = new Map([
    ["2026020060", { homeTeamCode: "MTL", homeScore: 3, awayScore: 2, periodType: "OT", gameState: "OFF" }],
    ["2026020040", { homeTeamCode: "TOR", homeScore: 4, awayScore: 1, periodType: "REG", gameState: "OFF" }],
  ]);
  const gameScores = new Map([["2026020060", { gameId: "2026020060", gameScore: 2.1, scoring: 1.6, onIce: 0.3, other: 0.2 }]]);

  it("orders oldest first and merges results, xG and Game Score", () => {
    const games = buildPlayerGameLog(log, scores, new Map([["2026020060", 0.84]]), false, gameScores);
    expect(games.map((g) => g.gameId)).toEqual(["2026020040", "2026020060"]);
    expect(games[0]).toMatchObject({ result: "W", teamScore: 4, opponentScore: 1, toiSeconds: 1205, xGoals: null, gameScore: null });
    expect(games[1]).toMatchObject({ result: "OTL", teamScore: 2, opponentScore: 3, periodType: "OT", xGoals: 0.84, gameScore: 2.1, gameScoreScoring: 1.6 });
  });
});
