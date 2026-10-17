import { describe, expect, it } from "vitest";
import { modelSettings, runSandbox } from "@/lib/projections/sandbox";
import type { SandboxInputs, SandboxTeam } from "@/types";

// 32 teams in 2 conferences × 2 divisions; strength rises with the index in the division.
function inputs(): SandboxInputs {
  const teams: SandboxTeam[] = [];
  for (const conference of ["E", "W"]) {
    for (const d of ["A", "B"]) {
      for (let i = 0; i < 8; i++) {
        const edge = (i - 3.5) * 0.2;
        teams.push({
          team: `${conference}${d}${i}`,
          conference,
          division: `${conference}${d}`,
          points: 0,
          gamesPlayed: 0,
          regulationWins: 0,
          season: { xgd: 0, gd: 0, n: 0 },
          prior: { xgd: edge, gd: edge },
          roster: 0,
          goalie: 0,
          goalieOutlook: null,
        });
      }
    }
  }
  const games = [];
  for (let r = 0; r < 40; r++) {
    for (let i = 0; i < teams.length; i++) {
      games.push({ gameId: `${r}-${i}`, home: teams[i].team, away: teams[(i + 1 + r) % teams.length].team, date: "2026-11-01", rest: 0 });
    }
  }
  return {
    season: 2026,
    runDate: "2026-10-16",
    model: { coefficients: [0.15, 0.65, 0.62, 0.76, 0.13, 0.26], priorGames: 60, carryOver: 0.35, rosterGames: 10, strengthSd: 0.25, overtimeRate: 0.22, starterGapCoefficient: 0.54 },
    teams,
    games,
    injuredGoalies: [],
  };
}

const odds = (i: SandboxInputs, s = modelSettings(i)) => new Map(runSandbox(i, s, 2000).map((o) => [o.abbrev, o.makePlayoffs]));

describe("runSandbox", () => {
  it("gives the same odds for the same inputs and settings", () => {
    const i = inputs();
    expect([...odds(i)]).toEqual([...odds(i)]);
  });

  it("favours stronger teams, and stops when strength is switched off", () => {
    const i = inputs();
    const model = odds(i);
    expect(model.get("EA7")!).toBeGreaterThan(model.get("EA0")! + 0.3);
    const luck = odds(i, { ...modelSettings(i), xg: 0, goals: 0, roster: 0, goalie: 0, uncertainty: 0 });
    expect(Math.abs(luck.get("EA7")! - luck.get("EA0")!)).toBeLessThan(0.1);
  });

  it("moves a team the reader rates higher", () => {
    const i = inputs();
    const base = odds(i);
    const nudged = odds(i, { ...modelSettings(i), nudges: { EA3: 10 } });
    expect(nudged.get("EA3")!).toBeGreaterThan(base.get("EA3")! + 0.1);
  });
});
