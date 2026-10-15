import { describe, expect, it } from "vitest";
import { milesBetween, raceSeries, teamTravel, type ScheduleGame } from "@/server/api/season-race";

const game = (date: string, away: string, home: string, awayScore = 0, homeScore = 0, state = "OFF", periodType: string | null = "REG"): ScheduleGame => ({
  gameDate: date, awayTeamCode: away, homeTeamCode: home, awayScore, homeScore, gameState: state, periodType,
});

describe("milesBetween", () => {
  it("is the great-circle distance between arenas", () => {
    // Toronto to Montreal is about 315 miles in a straight line.
    expect(Math.round(milesBetween("TOR", "MTL"))).toBeGreaterThan(300);
    expect(Math.round(milesBetween("TOR", "MTL"))).toBeLessThan(330);
    expect(milesBetween("TOR", "TOR")).toBe(0);
    expect(milesBetween("TOR", "XXX")).toBe(0);
  });
});

describe("raceSeries", () => {
  it("gives two for a win, one for an overtime or shootout loss, and skips unplayed games", () => {
    const series = raceSeries([
      game("2026-10-01", "TOR", "MTL", 2, 3, "OFF", "OT"),
      game("2026-10-03", "MTL", "TOR", 1, 4),
      game("2026-10-05", "TOR", "BOS", 0, 0, "FUT", null),
    ]);
    expect(series.get("TOR")).toEqual([
      { date: "2026-10-01", gamesPlayed: 1, points: 1 },
      { date: "2026-10-03", gamesPlayed: 2, points: 3 },
    ]);
    expect(series.get("MTL")?.at(-1)).toEqual({ date: "2026-10-03", gamesPlayed: 2, points: 2 });
    expect(series.has("BOS")).toBe(false);
  });
});

describe("teamTravel", () => {
  it("adds up miles from home, back-to-backs and the longest road trip", () => {
    const schedule = [
      game("2026-10-01", "TOR", "MTL", 1, 2),
      game("2026-10-02", "TOR", "OTT", 1, 2),
      game("2026-10-05", "BOS", "TOR", 0, 0, "FUT", null),
    ];
    const tor = teamTravel(schedule).find((t) => t.team === "TOR")!;
    const expected = milesBetween("TOR", "MTL") + milesBetween("MTL", "OTT") + milesBetween("OTT", "TOR");
    expect(tor.seasonMiles).toBe(Math.round(expected));
    expect(tor.milesSoFar).toBe(Math.round(milesBetween("TOR", "MTL") + milesBetween("MTL", "OTT")));
    expect(tor).toMatchObject({ gamesPlayed: 2, backToBacks: 1, backToBacksSoFar: 1, longestRoadTrip: 2 });
    // BOS starts at home and travels to Toronto for its only game.
    expect(teamTravel(schedule).find((t) => t.team === "BOS")).toMatchObject({ seasonMiles: Math.round(milesBetween("BOS", "TOR")), longestRoadTrip: 1 });
  });
});
