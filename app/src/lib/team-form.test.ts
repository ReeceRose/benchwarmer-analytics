import { describe, expect, it } from "vitest";
import { restDays, rollingForm, seasonXgShare, teamSplits } from "@/lib/team-form";
import type { TeamGameLogEntry } from "@/types";

function game(gameId: string, xgf: number, xga: number, gf: number, ga: number, gameDate = "2025-10-10", isHome = true): TeamGameLogEntry {
  const split = { goalsFor: gf, goalsAgainst: ga, xGoalsFor: xgf, xGoalsAgainst: xga, shotAttemptsFor: 0, shotAttemptsAgainst: 0 };
  return {
    gameId, gameDate, opponent: "TOR", isHome, teamScore: gf, opponentScore: ga,
    periodType: "REG", result: gf > ga ? "W" : "L", all: split, fiveOnFive: split,
  };
}

describe("rollingForm", () => {
  it("sums over a trailing window, using fewer games early on", () => {
    const games = [game("1", 3, 1, 2, 0), game("2", 1, 1, 0, 0), game("3", 1, 3, 1, 3)];
    const points = rollingForm(games, "fiveOnFive", 2);
    expect(points.map((p) => [p.gameNum, p.windowGames, p.xgShare, p.goalShare])).toEqual([
      [1, 1, 75, 100],
      [2, 2, 4 / 6 * 100, 100],
      [3, 2, 2 / 6 * 100, 25],
    ]);
  });

  it("is null when nothing happened in the window", () => {
    expect(rollingForm([game("1", 0, 0, 0, 0)], "all", 10)[0]).toMatchObject({ xgShare: null, goalShare: null });
  });
});

describe("seasonXgShare", () => {
  it("is the xG share over every game", () => {
    expect(seasonXgShare([game("1", 3, 1, 0, 0), game("2", 1, 3, 0, 0)], "all")).toBe(50);
  });
});

describe("restDays", () => {
  it("counts days off before each game", () => {
    const games = [game("1", 1, 1, 0, 0, "2025-10-30"), game("2", 1, 1, 0, 0, "2025-10-31"), game("3", 1, 1, 0, 0, "2025-11-03")];
    expect(restDays(games)).toEqual([null, 0, 2]);
  });
});

describe("teamSplits", () => {
  it("splits by venue and rest, with records from final results", () => {
    const games = [
      game("1", 2, 1, 3, 1, "2025-10-10", true),
      game("2", 1, 3, 1, 2, "2025-10-11", false),
      { ...game("3", 1, 1, 2, 3, "2025-10-13", true), result: "OTL" as const },
    ];
    const [home, away, b2b, rest1, rest2] = teamSplits(games, "all");
    expect(home).toMatchObject({ games: 2, wins: 1, losses: 0, otLosses: 1, pointsPct: 0.75, goalsFor: 5, goalsAgainst: 4 });
    expect(home.xgShare).toBe(60);
    expect(away).toMatchObject({ games: 1, wins: 0, losses: 1, xgShare: 25 });
    expect(b2b.games).toBe(1);
    expect(rest1.games).toBe(1);
    expect(rest2).toMatchObject({ games: 0, pointsPct: null, xgShare: null });
  });
});
