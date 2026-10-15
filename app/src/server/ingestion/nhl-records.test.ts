import { describe, expect, it } from "vitest";
import { startYear, toCareerRow, toDraftPickRow, toFranchiseSeasonRow, toHeadToHeadRow, type RecordsFranchiseSeason } from "@/server/ingestion/nhl-records";

const season: RecordsFranchiseSeason = {
  franchiseId: 38, seasonId: 20222023, teamId: 54, triCode: "VGK", teamName: "Vegas Golden Knights",
  gamesPlayed: 82, wins: 51, losses: 22, ties: null, overtimeLosses: 9, points: 111, goals: 272, goalsAgainst: 229,
  divisionName: "Pacific", divisionSequence: 1, leagueSequence: 5,
  inPlayoffs: true, seriesTitle: "Stanley Cup Final", playoffRound: 4, finalPlayoffRound: 4, decision: "W",
};

describe("startYear", () => {
  it("turns NHL season IDs into start years", () => {
    expect(startYear(20242025)).toBe(2024);
    expect(startYear(null)).toBeNull();
  });
});

describe("toFranchiseSeasonRow", () => {
  it("marks a Cup when the last round played is the final and was won", () => {
    expect(toFranchiseSeasonRow(season)).toMatchObject({ season: 2022, goalsFor: 272, madePlayoffs: true, playoffResult: "Stanley Cup Final", playoffRound: 4, wonCup: true });
    expect(toFranchiseSeasonRow({ ...season, decision: "L" }).wonCup).toBe(false);
    expect(toFranchiseSeasonRow({ ...season, playoffRound: 2, seriesTitle: "2nd Round", decision: "L" })).toMatchObject({ playoffResult: "2nd Round", wonCup: false });
  });

  it("clears playoff fields for teams that missed and treats 0 ranks as missing", () => {
    expect(
      toFranchiseSeasonRow({ ...season, inPlayoffs: false, seriesTitle: null, playoffRound: null, decision: null, divisionSequence: 0 }),
    ).toMatchObject({ madePlayoffs: false, playoffResult: null, playoffRound: null, wonCup: false, divisionRank: null });
  });
});

describe("toHeadToHeadRow", () => {
  it("maps totals and the playoff flag", () => {
    expect(
      toHeadToHeadRow({
        teamFranchiseId: 5, opponentFranchiseId: 6, gameTypeId: 3, totalGamesPlayed: 84, totalWins: 36, totalLosses: 48,
        totalTies: null, totalOtLosses: null, totalGoalsFor: 220, totalGoalsAgainst: 250, totalLastMeetingSeasonId: 20172018,
      }),
    ).toEqual({
      franchiseId: 5, opponentFranchiseId: 6, isPlayoffs: true, gamesPlayed: 84, wins: 36, losses: 48, ties: 0,
      overtimeLosses: 0, goalsFor: 220, goalsAgainst: 250, lastMeetingSeason: 2017,
    });
  });
});

describe("toDraftPickRow", () => {
  const pick = {
    id: 15657, draftYear: 2015, roundNumber: 1, pickInRound: 1, overallPickNumber: 1, draftedByTeamId: 22, triCode: "EDM",
    playerId: 8478402, playerName: "Connor McDavid", position: "C", amateurClubName: "Erie", amateurLeague: "OHL",
    countryCode: "CAN", birthDate: "1997-01-13", supplementalDraft: "N",
  };

  it("resolves the franchise from the team ID", () => {
    expect(toDraftPickRow(pick, new Map([[22, 25]]))).toMatchObject({ franchiseId: 25, teamAbbreviation: "EDM", overallPick: 1, playerId: 8478402 });
    expect(toDraftPickRow(pick, new Map())?.franchiseId).toBeNull();
  });

  it("drops supplemental picks and blanks empty strings", () => {
    expect(toDraftPickRow({ ...pick, supplementalDraft: "Y" }, new Map())).toBeNull();
    expect(toDraftPickRow({ ...pick, playerId: 0, amateurLeague: "" }, new Map())).toMatchObject({ playerId: null, amateurLeague: null });
  });
});

describe("toCareerRow", () => {
  it("keeps skater scoring or goalie wins", () => {
    const base = { playerId: 1, firstName: "A", lastName: "B", gamesPlayed: 10, firstSeasonForGameType: 20152016, lastSeasonForGameType: 20252026, activePlayer: true };
    expect(toCareerRow({ ...base, positionCode: "C", goals: 3, assists: 4, points: 7 }, false)).toMatchObject({ name: "A B", points: 7, wins: null, firstSeason: 2015, isActive: true });
    expect(toCareerRow({ ...base, wins: 6 }, true)).toMatchObject({ position: "G", goals: null, wins: 6 });
  });
});

describe("toAwardRow", () => {
  it("resolves the franchise and skips rows without a name", async () => {
    const { toAwardRow, toTrophyRow } = await import("@/server/ingestion/nhl-records");
    const award = { id: 1, trophyId: 8, seasonId: 20252026, status: "WINNER", fullName: " Nikita Kucherov ", playerId: 8476453, teamId: 14, isRookie: false };
    expect(toAwardRow(award, new Map([[14, 31]]))).toMatchObject({ season: 2025, fullName: "Nikita Kucherov", franchiseId: 31, playerId: 8476453 });
    expect(toAwardRow({ ...award, teamId: null, playerId: null }, new Map())).toMatchObject({ teamId: null, franchiseId: null, playerId: null });
    expect(toAwardRow({ ...award, fullName: null }, new Map())).toBeNull();
    expect(toTrophyRow({ id: 8, name: "Hart Memorial Trophy ", shortName: "hart-memorial", categoryId: 2, briefDescription: "MVP " })).toEqual({
      id: 8, name: "Hart Memorial Trophy", slug: "hart-memorial", categoryId: 2, description: "MVP", imageUrl: null,
    });
  });
});

describe("records HTML lists", () => {
  it("turns list items into text, skipping footnotes and empty lists", async () => {
    const { listItems, htmlToText } = await import("@/server/ingestion/nhl-records");
    const html = `<ul class="striped-list">
      <li>Connor McDavid: 2016-17 &ndash;&nbsp;Present</li>
      <li>Lee Fogolin&nbsp;Jr: 1980-81</li>
      <li>* <em>Includes time with WHA&rsquo;s Edmonton Oilers</em></li>
      <li>None</li>
    </ul>`;
    expect(listItems(html)).toEqual(["Connor McDavid: 2016-17 – Present", "Lee Fogolin Jr: 1980-81"]);
    expect(htmlToText("<p>One<br />Two &amp; three</p><p>Caf&eacute; &#233;</p>")).toBe("One\nTwo & three\nCafé é");
    expect(listItems(null)).toEqual([]);
  });

  it("parses people and retired numbers", async () => {
    const { parsePerson, parseRetired } = await import("@/server/ingestion/nhl-records");
    expect(parsePerson("Kris Knoblauch: Nov. 13, 2023 – April 30, 2026")).toEqual({ name: "Kris Knoblauch", tenure: "Nov. 13, 2023 – April 30, 2026" });
    expect(parsePerson("(No Captain): 2015-16")).toEqual({ name: "No captain", tenure: "2015-16" });
    expect(parseRetired("99 – Wayne Gretzky (1979-88)")).toEqual({ sweaterNumber: 99, name: "Wayne Gretzky", tenure: "1979-88" });
    expect(parseRetired("3 – Al Hamilton (1972-80)*")).toEqual({ sweaterNumber: 3, name: "Al Hamilton", tenure: "1972-80" });
    expect(parseRetired("Something odd")).toEqual({ sweaterNumber: null, name: "Something odd", tenure: null });
  });
});

describe("milestone and lottery rows", () => {
  it("keeps career games for career milestones and season games and totals for season ones", async () => {
    const { toMilestoneRow } = await import("@/server/ingestion/nhl-records");
    const base = {
      gameId: 2015020625, gameDate: "2016-01-10T00:00:00", seasonId: 20152016, skaterId: 8471214, skaterFirstName: "Alex",
      skaterLastName: "Ovechkin", skaterTeamId: 15, homeTriCode: "WSH", visitorTriCode: "OTT", homeScore: 7, visitorScore: 1,
      ageInYears: 30, skaterGamesPlayed: 801, skaterSeasonGamesPlayed: 41, goalieFirstName: "Andrew", goalieLastName: "Hammond", activePlayer: 1,
    };
    expect(toMilestoneRow("goals-500", false, base)).toMatchObject({
      id: "goals-500-2015020625-8471214", season: 2015, gameDate: "2016-01-10", gamesPlayed: 801, seasonTotal: null, goalieName: "Andrew Hammond", isActive: true,
    });
    expect(toMilestoneRow("season-goals-50", true, { ...base, seasonGoals: 50, goalieFirstName: null, goalieLastName: null })).toMatchObject({
      gamesPlayed: 41, seasonTotal: 50, goalieName: null,
    });
  });

  it("pulls the odds chart and plain text out of the lottery HTML", async () => {
    const { toLotteryRow } = await import("@/server/ingestion/nhl-records");
    const row = toLotteryRow({
      draftYear: 2026,
      formatContent: "<p>Two phases.<br />\r\n<br />Fourteen balls.</p>",
      oddsContent: '<p><img src="https://x.test/Odds (1).png" /></p><p>* <i>Toronto&rsquo;s pick</i></p>',
      resultNotes: null,
    });
    expect(row).toEqual({
      draftYear: 2026,
      format: "Two phases.\nFourteen balls.",
      oddsImageUrl: "https://x.test/Odds%20(1).png",
      notes: "* Toronto’s pick",
      results: null,
    });
  });

  it("adds a goalie's Game 7 and overtime record from the playoff row", async () => {
    const { toCareerRow } = await import("@/server/ingestion/nhl-records");
    const regular = { playerId: 8471679, firstName: "Carey", lastName: "Price", gamesPlayed: 712, wins: 361 };
    const playoffs = { ...regular, gamesPlayed: 92, gameSevenWins: 3, gameSevenLosses: 1, overtimeWins: 15, overtimeLosses: 8, overtimeSavePctg: 0.93985 };
    expect(toCareerRow(regular, true, playoffs)).toMatchObject({
      wins: 361, playoffGames: 92, gameSevenWins: 3, gameSevenLosses: 1, playoffOvertimeWins: 15, playoffOvertimeLosses: 8, playoffOvertimeSavePct: "0.9398",
    });
    expect(toCareerRow(regular, true)).toMatchObject({ playoffGames: null, gameSevenWins: null });
  });
});
