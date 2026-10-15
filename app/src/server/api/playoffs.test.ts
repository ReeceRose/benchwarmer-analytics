import { describe, expect, it } from "vitest";
import { toBracket } from "@/server/api/playoffs";

const team = (id: number, abbrev: string) => ({ id, abbrev, name: { default: abbrev } });
const series = (letter: string, round: number, winner = 1) => ({
  seriesLetter: letter, playoffRound: round, seriesTitle: `R${round}`, topSeedWins: 4, bottomSeedWins: 2,
  topSeedRankAbbrev: "D1", bottomSeedRankAbbrev: "WC1", winningTeamId: winner, topSeedTeam: team(1, "AAA"), bottomSeedTeam: team(2, "BBB"),
});

describe("toBracket", () => {
  it("splits each round into halves by letter and drops the qualifying round", () => {
    const out = toBracket([series("B", 1), series("A", 1), series("C", 1), series("D", 1), series("I", 2), series("J", 2), series("O", 4, 2), series("S", 0)]);
    expect(out.map((s) => [s.letter, s.half])).toEqual([
      ["A", "left"], ["B", "left"], ["C", "right"], ["D", "right"], ["I", "left"], ["J", "right"], ["O", null],
    ]);
    expect(out[0].top).toEqual({ team: "AAA", name: "AAA", seed: "D1", wins: 4, won: true });
    expect(out.at(-1)?.bottom.won).toBe(true);
  });
});
