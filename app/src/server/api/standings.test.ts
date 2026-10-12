import { describe, expect, it } from "vitest";
import {
  categoryRankings,
  estimatedRecord,
  expectedPoints,
  likelyToImprove,
  likelyToRegress,
  ordinal,
  pdoParts,
  ranks,
  rankPowerRankings,
  toOfficialStandings,
  type PowerRanking,
} from "@/server/api/standings";

describe("estimatedRecord", () => {
  it("uses Pythagorean wins and ~10% OT losses", () => {
    // 275²/(275²+190²) = 0.6769 → 55.5 wins → 56 (banker's: 55.51 rounds up)
    expect(estimatedRecord(82, 275, 190)).toEqual({ wins: 56, regLosses: 23, otLosses: 3, points: 115 });
  });

  it("is .500 with no goals", () => {
    expect(estimatedRecord(10, 0, 0)).toEqual({ wins: 5, regLosses: 5, otLosses: 0, points: 10 });
  });

  it("rounds exact halves to even, like C# Math.Round(double)", () => {
    // 5 losses * 0.1 = 0.5 → 0; 15 * 0.1 = 1.5 → 2
    expect(estimatedRecord(10, 0, 0).otLosses).toBe(0);
    expect(estimatedRecord(15, 1, 1000).otLosses).toBe(2);
  });
});

describe("expectedPoints / PDO", () => {
  it("expected points from xG", () => {
    expect(expectedPoints(82, 257.74, 230.89)).toBe(91);
    expect(expectedPoints(0, 10, 5)).toBe(0);
  });

  it("PDO floors shots at 1", () => {
    const parts = pdoParts({ shotsOnGoalFor: 100, shotsOnGoalAgainst: 100, goalsFor: 10, goalsAgainst: 8 });
    expect(parts.shootingPct).toBeCloseTo(10);
    expect(parts.savePct).toBeCloseTo(92);
    expect(parts.pdo).toBeCloseTo(102);
    expect(pdoParts({ shotsOnGoalFor: 0, shotsOnGoalAgainst: 0, goalsFor: 0, goalsAgainst: 0 }).pdo).toBe(100);
  });
});

describe("ordinal", () => {
  it.each([
    [1, "1st"], [2, "2nd"], [3, "3rd"], [4, "4th"], [11, "11th"], [12, "12th"], [13, "13th"],
    [21, "21st"], [22, "22nd"], [111, "111th"], [0, "0"],
  ])("%i → %s", (n, expected) => expect(ordinal(n)).toBe(expected));
});

function team(abbreviation: string, points: number, wins: number, xGoalsPct: number | null, pdo = 100): PowerRanking {
  return { abbreviation, name: abbreviation, points, wins, xGoalsPct, pdo } as PowerRanking;
}

describe("power rankings", () => {
  it("ranks by points then wins, and by xG% with nulls last", () => {
    const ranked = rankPowerRankings([team("A", 90, 40, 0.5), team("B", 90, 42, null), team("C", 80, 38, 0.55)]);
    expect(ranked.map((t) => [t.abbreviation, t.pointsRank, t.xGoalsPctRank])).toEqual([
      ["B", 1, 3],
      ["A", 2, 2],
      ["C", 3, 1],
    ]);
  });

  it("flags regression candidates by rank gap and PDO", () => {
    const teams = [
      { ...team("UNLUCKY", 0, 0, 0, 98.25), pointsRank: 20, xGoalsPctRank: 2 },
      { ...team("LUCKY", 0, 0, 0, 102.05), pointsRank: 1, xGoalsPctRank: 15 },
      { ...team("NEUTRAL", 0, 0, 0, 100), pointsRank: 25, xGoalsPctRank: 3 },
    ];
    expect(likelyToImprove(teams)).toEqual([
      {
        abbreviation: "UNLUCKY",
        name: "UNLUCKY",
        pointsRank: 20,
        xGoalsPctRank: 2,
        pdo: 98.25,
        reason: "2nd in xG%, 20th in points (PDO: 98.3)",
      },
    ]);
    expect(likelyToRegress(teams).map((t) => t.reason)).toEqual(["15th in xG%, 1st in points (PDO: 102.1)"]);
  });
});

describe("official standings", () => {
  it("sorts by points, wins, then fewer games and formats records", () => {
    const rows = toOfficialStandings([
      { teamAbbrev: { default: "A" }, points: 10, wins: 5, gamesPlayed: 7 },
      { teamAbbrev: { default: "B" }, points: 10, wins: 5, gamesPlayed: 6, streakCode: "W", streakCount: 3, homeWins: 2, homeLosses: 1 },
      { teamAbbrev: { default: "C" }, points: 12, wins: 6, gamesPlayed: 6, streakCode: "L", streakCount: 0 },
    ]);
    expect(rows.map((r) => [r.abbreviation, r.leagueRank, r.streak])).toEqual([
      ["C", 1, null],
      ["B", 2, "W3"],
      ["A", 3, null],
    ]);
    expect(rows[1].homeRecord).toBe("2-1-0");
  });
});

describe("category rankings", () => {
  it("ranks with stable ties", () => {
    const r = ranks([{ abbreviation: "A", v: 1 }, { abbreviation: "B", v: 1 }, { abbreviation: "C", v: 2 }], (t) => t.v, false);
    expect([...r]).toEqual([["A", 1], ["B", 2], ["C", 3]]);
  });

  it("weights ranks into an overall score and orders by it", () => {
    const base = {
      name: "", goalsFor: 0, goalsAgainst: 0, goalDifferential: 0, xGoalsFor: 0, xGoalsAgainst: 0,
      xGoalsPct: 0.5, corsiPct: 0.5, fenwickPct: 0.5, ppPct: 20, pkPct: 80, highDangerChancesFor: 0,
      highDangerChancesAgainst: 0, shootingPct: 10, savePct: 90, faceoffPct: 50, penaltiesDrawn: 0,
      penaltiesTaken: 0, penaltyDifferential: 0, hits: 0, hitsAgainst: 0, takeaways: 0, giveaways: 0,
      blockedShots: 0, points: null,
    };
    // B is better only on xG% (3x weight); every other category ties, so A
    // keeps rank 1 in those by input order.
    const result = categoryRankings(
      [
        { ...base, abbreviation: "A", points: 5 },
        { ...base, abbreviation: "B", xGoalsPct: 0.6 },
      ],
      true,
    );
    // A: (2+1)*3 + 7*1*2 + 14*1 = 37 → 37/34; B: (1+2)*3 + 7*2*2 + 14*2 = 65 → 65/34
    expect(result.map((t) => [t.abbreviation, t.overallRank, t.overallScore, t.pointsRank])).toEqual([
      ["A", 1, 1.09, 1],
      ["B", 2, 1.91, null],
    ]);
    expect(result[1].xGoalsPctRank).toBe(1);
  });
});
