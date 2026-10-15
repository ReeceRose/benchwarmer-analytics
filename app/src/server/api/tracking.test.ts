import { describe, expect, it } from "vitest";
import { peak, shotAreas, trackingSeason, zoneTime } from "@/server/api/tracking";

describe("trackingSeason", () => {
  it("uses the requested season, else the latest regular season listed", () => {
    const seasons = { seasonsWithEdgeStats: [{ id: 20242025, gameTypes: [2, 3] }, { id: 20252026, gameTypes: [2] }, { id: 20262027, gameTypes: [3] }] };
    expect(trackingSeason(seasons, 2023)).toBe(2023);
    expect(trackingSeason(seasons, undefined)).toBe(2025);
    expect(trackingSeason({}, undefined)).toBeNull();
  });
});

describe("peak", () => {
  it("rounds and keeps when it happened, with the player only for teams", () => {
    const m = {
      imperial: 24.0134,
      percentile: 0.99771,
      leagueAvg: { imperial: 21.4875 },
      overlay: {
        player: { firstName: { default: "Gavin" }, lastName: { default: "McKenna" } },
        gameDate: "2026-10-08",
        awayTeam: { abbrev: "TOR" },
        homeTeam: { abbrev: "VGK" },
        periodDescriptor: { number: 3 },
        timeInPeriod: "02:05",
      },
    };
    expect(peak(m, 2)).toEqual({
      value: 24.01,
      leagueAverage: 21.49,
      percentile: 0.998,
      rank: null,
      moment: { gameDate: "2026-10-08", away: "TOR", home: "VGK", period: 3, timeInPeriod: "02:05", playerName: null },
    });
    expect(peak(m, 2, true).moment?.playerName).toBe("Gavin McKenna");
    expect(peak(null, 2)).toEqual({ value: null, leagueAverage: null, percentile: null, rank: null, moment: null });
  });
});

describe("shotAreas", () => {
  it("orders all, high, mid, long and skips missing areas", () => {
    const rows = [
      { locationCode: "long", shots: 3, shotsPercentile: 0.2, goals: 0, shootingPctg: 0 },
      { locationCode: "all", shots: 12, shotsRank: 7, shotsLeagueAvg: 8.169, goals: 3, shootingPctg: 0.25 },
    ];
    const areas = shotAreas(rows);
    expect(areas.map((a) => a.area)).toEqual(["all", "long"]);
    expect(areas[0].shots).toEqual({ value: 12, leagueAverage: 8.2, percentile: null, rank: 7 });
    expect(areas[0].shootingPct.value).toBe(0.25);
  });
});

describe("zoneTime", () => {
  it("maps the three zones", () => {
    const z = zoneTime({ offensiveZonePctg: 0.50320072, offensiveZonePercentile: 0.979, defensiveZonePctg: 0.32889, defensiveZoneRank: 3 });
    expect(z.offensive).toEqual({ value: 0.5032, leagueAverage: null, percentile: 0.979, rank: null });
    expect(z.neutral.value).toBeNull();
    expect(z.defensive.rank).toBe(3);
  });
});

describe("idFromSlug", () => {
  it("reads the player ID off the end of an EDGE slug", async () => {
    const { idFromSlug } = await import("@/server/api/tracking");
    expect(idFromSlug("connor-mcdavid-8478402")).toBe(8478402);
    expect(idFromSlug("no-id")).toBeNull();
    expect(idFromSlug(null)).toBeNull();
  });
});

describe("rinkAreas", () => {
  it("keeps shots for skaters and save % for goalies", async () => {
    const { rinkAreas } = await import("@/server/api/tracking");
    expect(rinkAreas([{ area: "Crease", shots: 3, shotsPercentile: 0.91234 }])).toEqual([
      { area: "Crease", value: 3, percentile: 0.912, rank: null, saves: null },
    ]);
    expect(rinkAreas([{ area: "Crease", saves: 16, savePctg: 0.941176, savePctgPercentile: 0.4576 }], true)).toEqual([
      { area: "Crease", value: 0.9412, percentile: 0.458, rank: null, saves: 16 },
    ]);
  });
});
