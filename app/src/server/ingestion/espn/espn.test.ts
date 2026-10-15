import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  athleteIdFromLinks,
  espnDate,
  EspnFormatError,
  parseAthlete,
  parseEntries,
  parseInjuries,
  parseOdds,
  parseScoreboard,
  parseTransactionsPage,
  teamCode,
  transactionSchema,
} from "@/server/ingestion/espn/client";
import { flattenInjuries, injuryStatus, shouldResolve, toInjuryRow, usefulComment } from "@/server/ingestion/espn/injuries";
import { americanOdds, matchEvents, moneylinePair, toOddsRows } from "@/server/ingestion/espn/odds";
import { normalizeName, PlayerIndex } from "@/server/ingestion/espn/players";
import { classifyTransaction, extractPlayerNames, toTransactionRows } from "@/server/ingestion/espn/transactions";

const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(join(__dirname, "..", "__fixtures__", "espn", name), "utf8"));

describe("ESPN client", () => {
  it("maps ESPN team codes to ours", () => {
    expect(teamCode("NJ")).toBe("NJD");
    expect(teamCode("UTAH")).toBe("UTA");
    expect(teamCode("TOR")).toBe("TOR");
    expect(teamCode("ARI")).toBe("ARI");
    expect(teamCode("XYZ")).toBeNull();
    expect(teamCode(undefined)).toBeNull();
  });

  it("reads athlete IDs from player-card links", () => {
    expect(athleteIdFromLinks([{ href: "https://www.espn.com/nhl/player/_/id/5080145" }])).toBe("5080145");
    expect(athleteIdFromLinks([{ href: "https://www.espn.com/nhl/team" }])).toBeNull();
    expect(athleteIdFromLinks(undefined)).toBeNull();
  });

  it("parses ESPN's minute-precision dates", () => {
    expect(espnDate("2026-10-14T13:14Z")?.toISOString()).toBe("2026-10-14T13:14:00.000Z");
    expect(espnDate("nonsense")).toBeNull();
  });

  it("skips a few bad entries but fails on a format change", () => {
    const good = { date: "2026-10-14T07:00Z", description: "Recalled D X Y.", team: { abbreviation: "TOR" } };
    const few = parseEntries("t", [good, good, good, {}, good, good, good, good, good, good, good, good], transactionSchema);
    expect(few).toMatchObject({ skipped: 1 });
    expect(few.entries).toHaveLength(11);
    expect(() => parseEntries("t", [good, {}, {}, {}], transactionSchema)).toThrow(EspnFormatError);
  });

  it("rejects a response with the wrong top-level shape", () => {
    expect(() => parseInjuries({ teams: [] })).toThrow(EspnFormatError);
    expect(() => parseOdds({})).toThrow(EspnFormatError);
  });

  it("parses the injury list with team codes", () => {
    const teams = parseInjuries(fixture("injuries.json"));
    expect(teams.length).toBeGreaterThan(0);
    expect(teams.every((t) => t.team !== null)).toBe(true);
    const { entries, skipped } = flattenInjuries(teams);
    expect(skipped).toBe(0);
    expect(entries[0]).toMatchObject({ espnId: "5080145", team: "ANA" });
  });

  it("parses an athlete", () => {
    expect(parseAthlete(fixture("athlete.json"))).toMatchObject({ id: "5080145", dateOfBirth: "2004-01-19T08:00Z" });
  });

  it("parses transactions and scoreboard events", () => {
    const page = parseTransactionsPage(fixture("transactions.json"));
    expect(page.skipped).toBe(0);
    expect(page.entries.length).toBeGreaterThan(10);
    const events = parseScoreboard(fixture("scoreboard.json"));
    expect(events.entries[0].home).not.toBeNull();
    expect(events.entries[0].away).not.toBeNull();
  });
});

describe("injuries", () => {
  it("normalises statuses", () => {
    expect(injuryStatus("Injured Reserve", "INJURY_STATUS_IR")).toBe("ir");
    expect(injuryStatus("Day-To-Day", "INJURY_STATUS_DAYTODAY")).toBe("day_to_day");
    expect(injuryStatus("Out", "INJURY_STATUS_OUT")).toBe("out");
    expect(injuryStatus("Suspension")).toBe("suspended");
    expect(injuryStatus("Questionable")).toBe("other");
  });

  it("builds a row, dropping ESPN's 'Not Specified'", () => {
    const [team] = parseInjuries(fixture("injuries.json"));
    const entry = { ...team.injuries.entries[0], details: { type: "Knee", detail: "Not Specified", side: "Left", returnDate: "2026-10-20" } };
    const row = toInjuryRow(entry, "1", "ANA", 8483445);
    expect(row).toMatchObject({ team: "ANA", player_id: 8483445, injury_type: "Knee", detail: null, side: "Left", expected_return: "2026-10-20" });
  });

  it("drops comments that are only a status", () => {
    expect(usefulComment("ir")).toBeNull();
    expect(usefulComment(" day-to-day ")).toBeNull();
    expect(usefulComment("Andersen (knee) isn't expected back until December.")).toBe("Andersen (knee) isn't expected back until December.");
  });

  it("refuses to resolve against a list much shorter than what's open", () => {
    expect(shouldResolve(120, 128)).toBe(true);
    expect(shouldResolve(64, 128)).toBe(true);
    expect(shouldResolve(40, 128)).toBe(false);
    expect(shouldResolve(0, 128)).toBe(false);
    expect(shouldResolve(0, 0)).toBe(true);
    // Small lists (offseason) can swing a lot.
    expect(shouldResolve(3, 12)).toBe(true);
    expect(shouldResolve(0, 5)).toBe(false);
  });
});

describe("player matching", () => {
  const index = new PlayerIndex([
    { id: 1, name: "Cutter Gauthier", team: "ANA", birthDate: "2004-01-19" },
    { id: 2, name: "Julien Gauthier", team: "NYI", birthDate: "1997-10-15" },
    { id: 3, name: "Sebastian Aho", team: "CAR", birthDate: "1997-07-26" },
    { id: 4, name: "Sebastian Aho", team: "NYI", birthDate: "1996-02-17" },
    { id: 5, name: "Mitchell Marner", team: "VGK", birthDate: "1997-05-05" },
    { id: 6, name: "Tim Stützle", team: "OTT", birthDate: "2002-01-15" },
  ]);

  it("normalises names", () => {
    expect(normalizeName("Pierre-Luc Dubois Jr.")).toBe("pierre luc dubois");
    expect(normalizeName("Tim Stützle")).toBe("tim stutzle");
  });

  it("matches by name and date of birth", () => {
    expect(index.match("Sebastian Aho", { birthDate: "1996-02-17" })).toEqual({ playerId: 4, method: "name_dob" });
    expect(index.match("Mitch Marner", { birthDate: "1997-05-05" })).toEqual({ playerId: 5, method: "name_dob" });
    expect(index.match("Tim Stutzle", { birthDate: "2002-01-15" })).toEqual({ playerId: 6, method: "name_dob" });
  });

  it("falls back to team, then a unique name", () => {
    expect(index.match("Sebastian Aho", { team: "CAR" })).toEqual({ playerId: 3, method: "name_team" });
    expect(index.match("Cutter Gauthier")).toEqual({ playerId: 1, method: "name" });
    expect(index.match("Sebastian Aho")).toEqual({ playerId: null, method: "none" });
  });

  it("won't match a unique name with a different birthday", () => {
    expect(index.match("Cutter Gauthier", { birthDate: "1990-01-01" })).toEqual({ playerId: null, method: "none" });
  });
});

describe("transactions", () => {
  it("extracts player names", () => {
    expect(extractPlayerNames("Placed D Steven Santini, RW/LW Scott Sabourin and G Ryan Fanti on waivers.")).toEqual([
      "Steven Santini",
      "Scott Sabourin",
      "Ryan Fanti",
    ]);
    expect(extractPlayerNames("Acquired C Sam O’Reilly from Edmonton Oilers for LW Isaac Howard.")).toEqual(["Sam O’Reilly", "Isaac Howard"]);
    expect(extractPlayerNames("Placed Ds Tyrel Bauer and Isaak Phillips on waivers.")).toEqual(["Tyrel Bauer"]);
    expect(extractPlayerNames("LW Jonathan Drouin served his one-game suspension.")).toEqual(["Jonathan Drouin"]);
    expect(extractPlayerNames("Signed LW James van Riemsdyk to a one-year contract.")).toEqual(["James van Riemsdyk"]);
    expect(extractPlayerNames("Released Oliver Wahlstrom.")).toEqual([]);
  });

  it("classifies by the most specific sentence and takes its player", () => {
    expect(classifyTransaction("Recalled F Max Sasson from Abbotsford (AHL). Placed F Nils Hoglander on the injured reserve list.")).toEqual({
      kind: "ir_place",
      playerName: "Nils Hoglander",
    });
    expect(classifyTransaction("Reinstated LW Carter Mazur from injured reserve.")).toEqual({ kind: "ir_activate", playerName: "Carter Mazur" });
    expect(classifyTransaction("Activated D Sean Behrens off non-roster, injured reserve and reassigned him to Colorado (AHL).").kind).toBe(
      "ir_activate",
    );
    expect(classifyTransaction("Claimed G Colten Ellis off waivers from Tampa Bay.")).toEqual({ kind: "waivers", playerName: "Colten Ellis" });
    expect(classifyTransaction("Recalled F Zack MacEwen from Utica (AHL).").kind).toBe("recall");
    expect(classifyTransaction("Sent RW Jagger Firkus to Coachella Valley (AHL).").kind).toBe("assign");
    expect(classifyTransaction("Returned D Jacob Moverare to Ontario (AHL).").kind).toBe("assign");
    expect(classifyTransaction("Waived D Vincent Iorio.")).toEqual({ kind: "waivers", playerName: "Vincent Iorio" });
    expect(classifyTransaction("Signed D Lane Hutson to an eight-year contract extension.").kind).toBe("sign");
    expect(classifyTransaction("Acquired F Shane Bowers from New Jersey Devils for F Thomas Bordeleau.").kind).toBe("trade");
    expect(classifyTransaction("Released Oliver Wahlstrom.")).toEqual({ kind: "other", playerName: null });
  });

  it("builds rows, skipping unknown teams", () => {
    const index = new PlayerIndex([{ id: 9, name: "Aatu Raty", team: "VAN", birthDate: null }]);
    const { rows, skipped } = toTransactionRows(
      [
        { date: "2026-10-14T07:00Z", description: "Placed C Aatu Raty on waivers.", team: { abbreviation: "VAN" } },
        { date: "2026-10-14T07:00Z", description: "Recalled D X Y.", team: { abbreviation: "AHL" } },
      ],
      index,
    );
    expect(skipped).toBe(1);
    expect(rows).toEqual([
      { transactionDate: "2026-10-14", team: "VAN", description: "Placed C Aatu Raty on waivers.", kind: "waivers", playerName: "Aatu Raty", playerId: 9 },
    ]);
  });
});

describe("odds", () => {
  it("reads American odds", () => {
    expect(americanOdds("+120")).toBe(120);
    expect(americanOdds("-110")).toBe(-110);
    expect(americanOdds("EVEN")).toBe(100);
    expect(americanOdds("+1.5")).toBeNull();
    expect(americanOdds("50")).toBeNull();
    expect(americanOdds(null)).toBeNull();
  });

  it("removes the margin and rejects pairs that aren't moneylines", () => {
    const pair = moneylinePair(-110, -110);
    expect(pair?.homeProbability).toBeCloseTo(0.5, 6);
    expect(moneylinePair(-150, 130)?.homeProbability).toBeCloseTo(0.5798, 4);
    // Puck-line prices reported as a moneyline: both sides plus money.
    expect(moneylinePair(165, 120)).toBeNull();
    // In-game prices.
    expect(moneylinePair(-50000, 3000)).toBeNull();
    expect(moneylinePair(null, 120)).toBeNull();
  });

  it("keeps trusted books with usable lines", () => {
    const rows = toOddsRows("2025020250", "401802634", parseOdds(fixture("odds.json")).entries);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      provider: "ESPN BET",
      homeMoneylineOpen: -140,
      awayMoneylineOpen: 120,
      homeMoneylineClose: -145,
      awayMoneylineClose: 125,
      totalClose: "5.5",
    });
    expect(Number(rows[0].homeProbabilityClose)).toBeGreaterThan(0.5);
  });

  it("matches ESPN events to our games by teams", () => {
    const { matched, unmatched } = matchEvents(
      [
        { eventId: "1", home: "TOR", away: "MTL" },
        { eventId: "2", home: "BOS", away: null },
      ],
      [{ gameId: "2026020001", home: "TOR", away: "MTL" }],
    );
    expect(matched).toEqual([{ eventId: "1", gameId: "2026020001" }]);
    expect(unmatched).toBe(1);
  });
});
