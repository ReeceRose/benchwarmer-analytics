import { describe, expect, it } from "vitest";
import { homeAwayBySeason, homeAwaySide, type HomeAwayTotals } from "@/server/api/home-away";

const zero: HomeAwayTotals = {
  gp: 0, wins: 0, losses: 0, ot_losses: 0, gf: 0, ga: 0, sf: 0, sa: 0, fow: 0, fol: 0, pen_drawn: 0, pen_taken: 0, pim_drawn: 0, pim_taken: 0,
  toi: 0, ev_xgf: 0, ev_xga: 0, ev_cf: 0, ev_ca: 0, ev_gf: 0, ev_ga: 0, ev_sf: 0, ev_sa: 0, pp_toi: 0, pp_gf: 0,
  pk_toi: 0, pk_ga: 0,
};

describe("homeAwaySide", () => {
  it("turns season totals into per-game, per-60 and percentage rates", () => {
    const side = homeAwaySide({
      ...zero,
      gp: 41, wins: 25, losses: 12, ot_losses: 4,
      gf: 144, ga: 104, sf: 1230, sa: 1100, fow: 1000, fol: 900, pen_drawn: 160, pen_taken: 150,
      toi: 41 * 3600, ev_xgf: 90, ev_xga: 80, ev_cf: 2200, ev_ca: 1800, ev_gf: 95, ev_ga: 70, ev_sf: 1000, ev_sa: 875,
      pp_toi: 41 * 300, pp_gf: 25, pk_toi: 41 * 240, pk_ga: 20,
    });
    expect(side).toMatchObject({
      gamesPlayed: 41,
      pointsPct: 0.659,
      goalsForPerGame: 3.51,
      goalsAgainstPerGame: 2.54,
      shotsForPerGame: 30,
      faceoffPct: 52.6,
      xGoalsPct: 52.9,
      corsiPct: 55,
      shootingPct: 9.5,
      savePct: 92,
      ppMinutesPerGame: 5,
      pkMinutesPerGame: 4,
      ppGoalsPer60: 7.32,
      pkGoalsAgainstPer60: 7.32,
      penaltiesDrawn: 160,
      penaltiesTaken: 150,
      penaltiesDrawnPer60: 3.9,
      penaltiesTakenPer60: 3.66,
      netPenaltiesPer60: 0.24,
    });
  });

  it("has no percentages before any games", () => {
    const side = homeAwaySide(zero);
    expect(side.pointsPct).toBeNull();
    expect(side.xGoalsPct).toBeNull();
    expect(side.goalsForPerGame).toBe(0);
    expect(side.ppGoalsPer60).toBe(0);
  });
});

describe("homeAwayBySeason", () => {
  it("adds up teams per season and side, oldest season first", () => {
    const row = (season: number, team: string, is_home: boolean, gp: number, gf: number) => ({
      ...zero, season, team, is_home, gp, gf,
    });
    const seasons = homeAwayBySeason([
      row(2025, "BOS", true, 41, 144),
      row(2024, "BOS", false, 41, 100),
      row(2025, "TOR", true, 41, 120),
      row(2025, "BOS", false, 41, 124),
    ]);
    expect(seasons.map((s) => s.season)).toEqual([2024, 2025]);
    expect(seasons[0].home.gamesPlayed).toBe(0);
    expect(seasons[1].home).toMatchObject({ gamesPlayed: 82, goalsForPerGame: 3.22 });
    expect(seasons[1].away).toMatchObject({ gamesPlayed: 41, goalsForPerGame: 3.02 });
  });
});
