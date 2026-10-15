import { describe, expect, it } from "vitest";
import { penaltyRates, rankingsForVenue, venueTotals } from "@/lib/venue-penalties";
import type { TeamSpecialTeamsRanking, TeamVenuePenalties } from "@/types";

const tbl: TeamVenuePenalties = {
  team: "TBL",
  home: {
    gamesPlayed: 41, iceTimeSeconds: 148970, drawn: 197, taken: 191, pimDrawn: 456, pimTaken: 477,
    ppSeconds: 11775, pkSeconds: 11597, ppGoals: 21, pkGoalsAgainst: 21,
  },
  away: {
    gamesPlayed: 41, iceTimeSeconds: 149288, drawn: 189, taken: 202, pimDrawn: 461, pimTaken: 482,
    ppSeconds: 11777, pkSeconds: 12090, ppGoals: 25, pkGoalsAgainst: 20,
  },
};

describe("venue penalties", () => {
  it("rates one venue per 60 of all-situations time", () => {
    expect(penaltyRates(venueTotals(tbl, "home"))).toMatchObject({
      gamesPlayed: 41,
      penaltiesDrawn: 197,
      penaltiesTaken: 191,
      netPenalties: 6,
      penaltiesDrawnPer60: 4.76,
      penaltiesTakenPer60: 4.62,
      netPenaltiesPer60: 0.14,
      ppMinutesPerGame: 4.79,
      ppGoalsPer60: 6.42,
    });
  });

  it("adds home and road together for all games", () => {
    expect(venueTotals(tbl, "all")).toMatchObject({ gamesPlayed: 82, drawn: 386, taken: 393, iceTimeSeconds: 298258 });
    expect(penaltyRates(venueTotals(tbl, "all")).penaltiesDrawnPer60).toBe(4.66);
  });

  it("swaps a ranking's penalty fields for the venue and leaves the rest", () => {
    const ranking = { teamAbbreviation: "TBL", ppPct: 23.5, penaltiesDrawn: 386 } as TeamSpecialTeamsRanking;
    const missing = { teamAbbreviation: "XXX", penaltiesDrawn: 5 } as TeamSpecialTeamsRanking;
    const [own, other] = rankingsForVenue([ranking, missing], [tbl], "away");
    expect(own).toMatchObject({ ppPct: 23.5, penaltiesDrawn: 189, gamesPlayed: 41 });
    expect(other).toMatchObject({ penaltiesDrawn: 0, penaltiesDrawnPer60: 0 });
    expect(rankingsForVenue([ranking], [tbl], "all")[0]).toBe(ranking);
  });
});
