import { describe, expect, it } from "vitest";
import {
  buildLiveGame,
  expectedGoal,
  gameSeconds,
  isHighDanger,
  applyReferenceXg,
  parseSituation,
  strengthFor,
  winProbabilitySeries,
  type LiveGameInputs,
} from "@/server/api/game-live";
import type { NhlPlay } from "@/server/api/nhl-client";

const AWAY_ID = 13;
const HOME_ID = 7;

function roster() {
  const spot = (teamId: number, playerId: number, last: string, positionCode: string, sweaterNumber: number) => ({
    teamId, playerId, firstName: { default: "X" }, lastName: { default: last }, positionCode, sweaterNumber,
  });
  return [
    spot(AWAY_ID, 1, "AwayC", "C", 10), spot(AWAY_ID, 2, "AwayL", "L", 11), spot(AWAY_ID, 3, "AwayR", "R", 12),
    spot(AWAY_ID, 4, "AwayD1", "D", 2), spot(AWAY_ID, 5, "AwayD2", "D", 3), spot(AWAY_ID, 6, "AwayG", "G", 30),
    spot(HOME_ID, 11, "HomeC", "C", 20), spot(HOME_ID, 12, "HomeL", "L", 21), spot(HOME_ID, 13, "HomeR", "R", 22),
    spot(HOME_ID, 14, "HomeD1", "D", 4), spot(HOME_ID, 15, "HomeD2", "D", 5), spot(HOME_ID, 16, "HomeG", "G", 31),
  ];
}

let order = 0;
function play(period: number, time: string, typeDescKey: string, details: NhlPlay["details"], situationCode = "1551", periodType = "REG"): NhlPlay {
  return {
    sortOrder: ++order,
    periodDescriptor: { number: period, periodType },
    timeInPeriod: time,
    situationCode,
    homeTeamDefendingSide: period % 2 === 1 ? "left" : "right",
    typeDescKey,
    details,
  };
}

function inputs(plays: NhlPlay[], extra: Partial<LiveGameInputs> = {}): LiveGameInputs {
  return {
    gameId: "2026020001",
    landing: { gameState: "LIVE", awayTeam: { abbrev: "FLA", score: 1 }, homeTeam: { abbrev: "BUF", score: 0 } },
    boxscore: null,
    playByPlay: {
      awayTeam: { id: AWAY_ID, abbrev: "FLA" },
      homeTeam: { id: HOME_ID, abbrev: "BUF" },
      plays: [{ ...play(1, "00:00", "period-start", null), sortOrder: 0 }, ...plays],
      rosterSpots: roster(),
    },
    rightRail: null,
    shifts: [],
    standings: new Map(),
    clubStats: {},
    now: new Date("2026-10-12T18:00:00Z"),
    ...extra,
  };
}

describe("situation codes", () => {
  it("parses away goalie, away skaters, home skaters, home goalie", () => {
    expect(parseSituation("1541")).toEqual({ awayGoalie: 1, awaySkaters: 5, homeSkaters: 4, homeGoalie: 1 });
    expect(parseSituation("abc")).toBeNull();
  });

  it("labels strength from each team's point of view", () => {
    expect(strengthFor("1541", "away")).toEqual({ label: "5v4", state: "PP" });
    expect(strengthFor("1541", "home")).toEqual({ label: "4v5", state: "SH" });
    expect(strengthFor("1551", "home")).toEqual({ label: "5v5", state: "EV" });
    // Home pulled its goalie: away shoots at an empty net, home is still at even strength.
    expect(strengthFor("1560", "away").state).toBe("EN");
    expect(strengthFor("1560", "home")).toEqual({ label: "6v5", state: "EV" });
  });
});

describe("expectedGoal", () => {
  const base = { angle: 0, shotType: "wrist", rebound: false, state: "EV" as const };
  it("falls with distance and angle and rises for rebounds and tips", () => {
    expect(expectedGoal({ ...base, distance: 10 })).toBeGreaterThan(expectedGoal({ ...base, distance: 40 }));
    expect(expectedGoal({ ...base, distance: 20, angle: 50 })).toBeLessThan(expectedGoal({ ...base, distance: 20 }));
    expect(expectedGoal({ ...base, distance: 20, rebound: true })).toBeGreaterThan(expectedGoal({ ...base, distance: 20 }));
    expect(expectedGoal({ ...base, distance: 20, shotType: "tip-in" })).toBeGreaterThan(expectedGoal({ ...base, distance: 20 }));
  });

  it("is in a sensible range", () => {
    expect(expectedGoal({ ...base, distance: 10 })).toBeCloseTo(0.14, 2);
    expect(expectedGoal({ ...base, distance: 60 })).toBeLessThan(0.03);
    expect(expectedGoal({ ...base, distance: 150, state: "EN" })).toBe(0.6);
  });
});

describe("isHighDanger", () => {
  it("covers the slot and crease only", () => {
    expect(isHighDanger(80, 0)).toBe(true);
    expect(isHighDanger(70, 15)).toBe(true);
    expect(isHighDanger(40, 0)).toBe(false);
    expect(isHighDanger(80, 30)).toBe(false);
  });
});

describe("buildLiveGame", () => {
  it("normalizes coordinates so every team attacks +x", () => {
    // Period 1: home defends left, so away attacks left (negative x) and its coordinates flip.
    const result = buildLiveGame(inputs([
      play(1, "01:00", "shot-on-goal", { eventOwnerTeamId: AWAY_ID, shootingPlayerId: 1, goalieInNetId: 16, xCoord: -80, yCoord: 5 }),
      play(1, "02:00", "shot-on-goal", { eventOwnerTeamId: HOME_ID, shootingPlayerId: 11, goalieInNetId: 6, xCoord: 80, yCoord: 5 }),
      // Period 2: ends switch.
      play(2, "01:00", "shot-on-goal", { eventOwnerTeamId: AWAY_ID, shootingPlayerId: 1, goalieInNetId: 16, xCoord: 80, yCoord: -5 }),
    ]));
    expect(result.shots.map((s) => [s.team, s.x, s.y])).toEqual([["away", 80, -5], ["home", 80, 5], ["away", 80, -5]]);
    expect(result.shots[0].distance).toBeCloseTo(Math.hypot(9, 5), 1);
    expect(result.shots[0].goalie).toBe("X. HomeG");
  });

  it("counts attempts, blocks and goals per team, period and strength", () => {
    const result = buildLiveGame(inputs([
      play(1, "01:00", "shot-on-goal", { eventOwnerTeamId: AWAY_ID, shootingPlayerId: 1, xCoord: -80, yCoord: 0 }),
      play(1, "01:02", "goal", { eventOwnerTeamId: AWAY_ID, scoringPlayerId: 2, xCoord: -85, yCoord: 0 }),
      play(1, "03:00", "missed-shot", { eventOwnerTeamId: AWAY_ID, shootingPlayerId: 3, xCoord: -40, yCoord: 0, reason: "wide-left" }, "1541"),
      // Blocked shots belong to the blocking team in the NHL feed; the shooter decides the attempt's team.
      play(1, "04:00", "blocked-shot", { eventOwnerTeamId: AWAY_ID, shootingPlayerId: 11, blockingPlayerId: 4, xCoord: -60, yCoord: 0 }),
    ]));
    const away = result.stats.away;
    expect(away.all).toMatchObject({ attempts: 3, unblocked: 3, shotsOnGoal: 2, goals: 1, missed: 1, blocks: 1 });
    expect(away.byStrength.PP?.attempts).toBe(1);
    expect(away.byPeriod["1"].attempts).toBe(3);
    expect(result.stats.home.all).toMatchObject({ attempts: 1, blockedByOpponent: 1, unblocked: 0 });
    expect(away.missReasons).toEqual({ "wide-left": 1 });
    // The goal came 2 seconds after the previous attempt.
    expect(result.shots[1].rebound).toBe(true);
    expect(result.shots[3].xg).toBeNull();
  });

  it("tracks faceoffs by zone from each team's point of view", () => {
    const result = buildLiveGame(inputs([
      play(1, "05:00", "faceoff", { eventOwnerTeamId: AWAY_ID, winningPlayerId: 1, losingPlayerId: 11, zoneCode: "O", xCoord: -69, yCoord: 22 }),
      play(1, "06:00", "faceoff", { eventOwnerTeamId: HOME_ID, winningPlayerId: 11, losingPlayerId: 1, zoneCode: "N", xCoord: 0, yCoord: 0 }),
    ]));
    expect(result.stats.away.faceoffsByZone.O).toEqual({ won: 1, lost: 0 });
    expect(result.stats.home.faceoffsByZone.D).toEqual({ won: 0, lost: 1 });
    expect(result.stats.home.faceoffsByZone.N).toEqual({ won: 1, lost: 0 });
    expect(result.skaters).toEqual([]);
  });

  it("builds power-play segments and time by strength", () => {
    const result = buildLiveGame(inputs([
      play(1, "02:00", "faceoff", { eventOwnerTeamId: AWAY_ID, winningPlayerId: 1, losingPlayerId: 11, zoneCode: "N" }, "1451"),
      play(1, "04:00", "faceoff", { eventOwnerTeamId: AWAY_ID, winningPlayerId: 1, losingPlayerId: 11, zoneCode: "N" }, "1551"),
      play(1, "05:00", "stoppage", { reason: "icing" }, "1551"),
    ]));
    expect(result.strengthSegments).toEqual([
      { start: 120, end: 240, homeSkaters: 5, awaySkaters: 4, advantage: "home", emptyNet: false },
    ]);
    expect(result.stats.home.timeByStrength.PP).toBe(120);
    expect(result.stats.away.timeByStrength.SH).toBe(120);
    expect(result.timeBySkaters).toEqual({ "5v5": 180, "4v5": 120 });
    expect(result.stoppages).toEqual({ icing: 1 });
  });

  it("credits on-ice players from shifts and finds lines", () => {
    const shift = (playerId: number, start: string, end: string) => ({ playerId, period: 1, startTime: start, endTime: end, typeCode: 517 });
    const awaySkaters = [1, 2, 3, 4, 5].map((id) => shift(id, "00:00", "01:00"));
    const homeSkaters = [11, 12, 13, 14, 15].map((id) => shift(id, "00:00", "01:00"));
    const result = buildLiveGame(inputs([
      play(1, "00:30", "shot-on-goal", { eventOwnerTeamId: AWAY_ID, shootingPlayerId: 1, xCoord: -80, yCoord: 0 }),
      play(1, "01:30", "shot-on-goal", { eventOwnerTeamId: AWAY_ID, shootingPlayerId: 1, xCoord: -80, yCoord: 0 }),
    ], { shifts: [...awaySkaters, ...homeSkaters] }));
    expect(result.shots[0].onIceFor.sort()).toEqual([1, 2, 3, 4, 5]);
    expect(result.shots[0].onIceAgainst.sort((a, b) => a - b)).toEqual([11, 12, 13, 14, 15]);
    expect(result.shots[1].onIceFor).toEqual([]);
    expect(result.lines.away.forwards[0]).toMatchObject({ players: ["X. AwayC", "X. AwayL", "X. AwayR"], seconds: 60, attemptsFor: 1 });
    expect(result.lines.home.defense[0]).toMatchObject({ seconds: 60, attemptsAgainst: 1 });
    expect(result.shifts).toHaveLength(10);
  });

  it("skips the shootout", () => {
    const result = buildLiveGame(inputs([
      play(5, "00:00", "goal", { eventOwnerTeamId: AWAY_ID, scoringPlayerId: 1, xCoord: -80, yCoord: 0 }, "0101", "SO"),
    ]));
    expect(result.shots).toEqual([]);
    expect(result.meta.elapsedSeconds).toBe(0);
  });

  it("reads goals and penalties from the landing summary", () => {
    const result = buildLiveGame(inputs(
      [
        play(1, "10:05", "shot-on-goal", { eventOwnerTeamId: AWAY_ID, shootingPlayerId: 1, xCoord: -60, yCoord: 0 }, "1541"),
        {
          ...play(1, "11:00", "goal", { eventOwnerTeamId: AWAY_ID, scoringPlayerId: 2, goalieInNetId: 16, xCoord: -85, yCoord: 2, shotType: "wrist" }, "1541"),
          eventId: 284,
          pptReplayUrl: "https://wsr.nhle.com/sprites/20262027/2026020072/ev284.json",
        },
      ],
      {
        landing: {
          gameState: "LIVE",
          awayTeam: { abbrev: "FLA", score: 1 },
          homeTeam: { abbrev: "BUF", score: 0 },
          summary: {
            scoring: [{ periodDescriptor: { number: 1 }, goals: [{ timeInPeriod: "11:00", playerId: 2, name: { default: "X. AwayL" }, teamAbbrev: { default: "FLA" }, strength: "pp", awayScore: 1, homeScore: 0, assists: [] }] }],
            penalties: [{ periodDescriptor: { number: 1 }, penalties: [{ timeInPeriod: "10:00", type: "MIN", duration: 2, descKey: "high-sticking", teamAbbrev: { default: "BUF" }, committedByPlayer: { firstName: { default: "Y" }, lastName: { default: "HomeD1" } } }] }],
          },
        },
      },
    ));
    expect(result.goals[0]).toMatchObject({ team: "away", strength: "PP", goalie: "X. HomeG", distance: 4.5, eventId: 284, hasReplay: true });
    expect(result.penalties[0]).toMatchObject({ team: "home", player: "Y. HomeD1", infraction: "high sticking", powerPlayGoal: "X. AwayL", powerPlayAttempts: 2 });
  });

  it("starts at the right game second for later periods", () => {
    expect(gameSeconds(2, "05:30")).toBe(1530);
    expect(gameSeconds(4, "00:10")).toBe(3610);
  });
});

describe("MoneyPuck xG matching", () => {
  it("pairs by shooter first, then by team and time, zeroing the rest", () => {
    const shot = (team: "away" | "home", t: number, shooterId: number | null, result: "SOG" | "BLOCK" = "SOG") =>
      ({ team, t, shooterId, result, xg: 0.5 as number | null });
    const shots = [shot("away", 61, 1), shot("away", 66, 1), shot("home", 100, 11), shot("home", 200, 12), shot("away", 300, 2, "BLOCK")];
    applyReferenceXg(shots, [
      { team: "away", t: 60, shooterId: 1, xg: 0.2 },
      { team: "away", t: 62, shooterId: 1, xg: 0.3 },
      // Credited to a different shooter by MoneyPuck.
      { team: "home", t: 101, shooterId: 14, xg: 0.05 },
    ]);
    expect(shots.map((s) => s.xg)).toEqual([0.2, 0.3, 0.05, 0, 0.5]);
  });

  it("uses MoneyPuck xG, with 0 for attempts MoneyPuck lacks", () => {
    const plays = [
      play(1, "01:00", "shot-on-goal", { eventOwnerTeamId: AWAY_ID, shootingPlayerId: 1, xCoord: -80, yCoord: 0 }),
      play(1, "02:00", "shot-on-goal", { eventOwnerTeamId: AWAY_ID, shootingPlayerId: 2, xCoord: -80, yCoord: 0 }),
      play(1, "03:00", "blocked-shot", { eventOwnerTeamId: HOME_ID, shootingPlayerId: 3, xCoord: -60, yCoord: 0 }),
    ];
    const model = buildLiveGame(inputs(plays));
    const result = buildLiveGame(inputs(plays, { referenceXg: [{ team: "away", t: 60, shooterId: 1, xg: 0.42 }] }));
    expect(result.meta.xgSource).toBe("moneypuck");
    expect(model.meta.xgSource).toBe("model");
    expect(model.shots[1].xg).toBeGreaterThan(0);
    expect(result.shots.map((s) => s.xg)).toEqual([0.42, 0, null]);
    expect(result.stats.away.all.xg).toBe(0.42);
  });
});

describe("Game Score", () => {
  it("splits assists from the play-by-play and counts on-ice play at 5v5 only", () => {
    const shift = (playerId: number) => ({ playerId, period: 1, startTime: "00:00", endTime: "02:00", typeCode: 517 });
    const skater = (playerId: number, extra: object = {}) => ({ playerId, sweaterNumber: playerId, name: { default: `P${playerId}` }, position: "C", ...extra });
    const result = buildLiveGame(inputs(
      [
        play(1, "00:10", "faceoff", { eventOwnerTeamId: AWAY_ID, winningPlayerId: 1, losingPlayerId: 11, zoneCode: "N" }),
        play(1, "00:30", "shot-on-goal", { eventOwnerTeamId: AWAY_ID, shootingPlayerId: 1, xCoord: -80, yCoord: 0 }),
        play(1, "01:00", "goal", { eventOwnerTeamId: AWAY_ID, scoringPlayerId: 2, assist1PlayerId: 1, assist2PlayerId: 4, xCoord: -85, yCoord: 0 }),
        play(1, "01:20", "penalty", { eventOwnerTeamId: HOME_ID, committedByPlayerId: 11, drawnByPlayerId: 1, duration: 2 }, "1541"),
        // Power play: on ice, but not 5v5.
        play(1, "01:30", "shot-on-goal", { eventOwnerTeamId: AWAY_ID, shootingPlayerId: 3, xCoord: -80, yCoord: 0 }, "1541"),
      ],
      {
        shifts: [1, 2, 3, 4, 5, 11, 12, 13, 14, 15].map(shift),
        boxscore: {
          playerByGameStats: {
            awayTeam: {
              forwards: [skater(1, { assists: 1, sog: 1 }), skater(2, { goals: 1, sog: 1 }), skater(3, { sog: 1 })],
              defense: [skater(4, { assists: 1 }), skater(5)],
            },
            homeTeam: { forwards: [skater(11)], defense: [] },
          },
        },
      },
    ));
    const byId = new Map(result.skaters.map((s) => [s.playerId, s]));
    const p1 = byId.get(1)!;
    expect(p1).toMatchObject({ primaryAssists: 1, secondaryAssists: 0, onIceAttemptsFor5v5: 2, onIceGoalsFor5v5: 1, onIceAttemptsFor: 3 });
    // 0.7 A1 + 0.075 SOG | 0.05 × 2 CF + 0.15 GF | 0.15 drawn + 0.01 FOW
    expect(p1.gameScore.scoring).toBe(0.77);
    expect(p1.gameScore.onIce).toBeCloseTo(0.25, 2);
    expect(p1.gameScore.other).toBeCloseTo(0.16, 2);
    expect(byId.get(4)!).toMatchObject({ primaryAssists: 0, secondaryAssists: 1 });
    expect(byId.get(4)!.gameScore.total).toBeCloseTo(0.8, 2);
    // −0.15 taken − 0.01 FOL − 0.05 × 2 CA − 0.15 GA
    expect(byId.get(11)!.gameScore.total).toBeCloseTo(-0.41, 2);
  });
});

describe("winProbabilitySeries", () => {
  const situationAt = new Array(3601).fill("1551");

  it("starts near the home-ice rate and steps at goals", () => {
    const series = winProbabilitySeries({ elapsed: 1800, situationAt, goals: [{ t: 600, team: "away" }], final: null });
    expect(series[0]).toMatchObject({ t: 0 });
    expect(series[0].home).toBeGreaterThan(0.5);
    expect(series[0].home).toBeLessThan(0.6);
    const atGoal = series.filter((p) => p.t === 600);
    expect(atGoal).toHaveLength(2);
    expect(atGoal[1].home).toBeLessThan(atGoal[0].home - 0.1);
    expect(series.at(-1)!.t).toBe(1800);
  });

  it("grows with a lead as time runs out", () => {
    const series = winProbabilitySeries({ elapsed: 3500, situationAt, goals: [{ t: 100, team: "home" }], final: null });
    const at = (t: number) => series.find((p) => p.t === t)!.home;
    expect(at(1200)).toBeLessThan(at(2400));
    expect(at(2400)).toBeLessThan(at(3500));
    expect(at(3500)).toBeGreaterThan(0.9);
  });

  it("ends at the result when final, including shootouts", () => {
    const series = winProbabilitySeries({ elapsed: 3900, situationAt, goals: [], final: { homeScore: 2, awayScore: 3 } });
    expect(series.at(-1)).toEqual({ t: 3900, home: 0 });
  });
});
