import { describe, expect, it } from "vitest";
import { seriesWinProbability, simulateSeason, type SimGame, type SimTeam } from "@/server/projections/simulate";

const COEF = [0.18, 0.63, 0.52];

// 32 teams: 2 conferences × 2 divisions × 8. Team strength rises with its index in the division.
function league(): SimTeam[] {
  const teams: SimTeam[] = [];
  for (const conference of ["E", "W"]) {
    for (const division of ["A", "B"]) {
      for (let i = 0; i < 8; i++) {
        teams.push({
          abbrev: `${conference}${division}${i}`,
          conference,
          division: `${conference}${division}`,
          points: 0,
          gamesPlayed: 0,
          regulationWins: 0,
          rating: { xgd: (i - 3.5) * 0.15, gd: (i - 3.5) * 0.15, gamesPlayed: 0 },
        });
      }
    }
  }
  return teams;
}

function schedule(teams: SimTeam[], rounds: number): SimGame[] {
  const games: SimGame[] = [];
  let id = 0;
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < teams.length; i++) {
      const j = (i + 1 + r) % teams.length;
      games.push({ gameId: String(id++), home: teams[i].abbrev, away: teams[j].abbrev });
    }
  }
  return games;
}

describe("seriesWinProbability", () => {
  it("is a coin flip for equal teams and certain for a team that never loses", () => {
    expect(seriesWinProbability(0.5, 0.5)).toBeCloseTo(0.5, 10);
    expect(seriesWinProbability(1, 0)).toBe(1);
    expect(seriesWinProbability(0.6, 0.6)).toBeGreaterThan(0.6);
  });
});

describe("simulateSeason", () => {
  const teams = league();
  const result = simulateSeason(teams, schedule(teams, 40), { sims: 4000, seed: 7, coefficients: COEF, overtimeRate: 0.22, watch: ["0"] });
  const sum = (key: keyof (typeof result.odds)[number]) => result.odds.reduce((s, o) => s + (o[key] as number), 0);

  it("fills the bracket exactly once per simulation", () => {
    expect(sum("makePlayoffs")).toBeCloseTo(16, 6);
    expect(sum("winRound1")).toBeCloseTo(8, 6);
    expect(sum("winRound2")).toBeCloseTo(4, 6);
    expect(sum("winConference")).toBeCloseTo(2, 6);
    expect(sum("winCup")).toBeCloseTo(1, 6);
  });

  it("rewards stronger teams", () => {
    const odds = new Map(result.odds.map((o) => [o.abbrev, o]));
    expect(odds.get("EA7")!.makePlayoffs).toBeGreaterThan(odds.get("EA0")!.makePlayoffs);
    expect(odds.get("EA7")!.pointsAvg).toBeGreaterThan(odds.get("EA0")!.pointsAvg);
    expect(odds.get("EA7")!.pointsP90).toBeGreaterThanOrEqual(odds.get("EA7")!.pointsP10);
  });

  it("conditions a watched game's playoff odds on its result", () => {
    const [g] = result.watched;
    expect(g.homeIfWin).toBeGreaterThanOrEqual(g.homeIfLoss);
    expect(g.awayIfWin).toBeGreaterThanOrEqual(g.awayIfLoss);
  });

  it("is reproducible for a seed", () => {
    const again = simulateSeason(teams, schedule(teams, 40), { sims: 4000, seed: 7, coefficients: COEF, overtimeRate: 0.22 });
    expect(again.odds).toEqual(result.odds);
  });
});
