import { describe, expect, it } from "vitest";
import { rankMilestones, toMilestone, withCurrentTotals, withoutInjured } from "@/server/api/milestones";
import type { Milestone, PlayerInjury } from "@/types";

const skater = { playerId: 1, playerFullName: "A Player", teamAbbrev: "TOR", gameTypeId: 2, gamesPlayed: 800 };

describe("toMilestone", () => {
  it("estimates games away at the career rate", () => {
    // 698 points in 700 games ≈ 0.997 a game; 2 to go → 3 games (rounded up).
    expect(toMilestone({ ...skater, milestone: "Points", milestoneAmount: 700, points: 698, gamesPlayed: 700 }, "skater")).toMatchObject({
      current: 698,
      remaining: 2,
      gamesAway: 3,
    });
  });

  it("counts games-played milestones one a game", () => {
    expect(toMilestone({ ...skater, milestone: "Games Played", milestoneAmount: 900, gamesPlayed: 896 }, "skater")?.gamesAway).toBe(4);
  });

  it("drops reached milestones and small targets", () => {
    expect(toMilestone({ ...skater, milestone: "Points", milestoneAmount: 1400, points: 1400 }, "skater")).toBeNull();
    expect(toMilestone({ ...skater, milestone: "Assists", milestoneAmount: 100, assists: 99 }, "skater")).toBeNull();
  });

  it("reads goalie totals and ignores unknown milestones", () => {
    const goalie = { playerId: 2, playerFullName: "A Goalie", gameTypeId: 2, gamesPlayed: 467 };
    expect(toMilestone({ ...goalie, milestone: "Shutouts", milestoneAmount: 30, so: 27 }, "goalie")).toMatchObject({ remaining: 3, team: null });
    expect(toMilestone({ ...goalie, milestone: "Minutes Played", milestoneAmount: 30000, toiMinutes: 26836 }, "goalie")).toBeNull();
  });

  it("has no estimate without games", () => {
    expect(toMilestone({ ...skater, gamesPlayed: 0, milestone: "Goals", milestoneAmount: 200, goals: 199 }, "skater")?.gamesAway).toBeNull();
  });
});

describe("rankMilestones", () => {
  const m = (playerId: number, gamesAway: number | null, target = 500, name = `P${playerId}`): Milestone => ({
    playerId, name, team: null, position: "skater", milestone: "Points", target, current: 0, remaining: 1, gamesAway,
  });

  it("sorts by games away, then the bigger target, and keeps each player's nearest", () => {
    const ranked = rankMilestones([m(1, 5), m(2, 2, 500), m(3, 2, 1000), m(2, 9, 600), m(4, null)]);
    expect(ranked.map((r) => [r.playerId, r.gamesAway])).toEqual([[3, 2], [2, 2], [1, 5], [4, null]]);
  });

  it("caps the list", () => {
    expect(rankMilestones(Array.from({ length: 20 }, (_, i) => m(i, i)), 5)).toHaveLength(5);
  });
});

describe("withoutInjured", () => {
  const m = (playerId: number): Milestone => ({
    playerId, name: `P${playerId}`, team: null, position: "skater", milestone: "Points", target: 500, current: 499, remaining: 1, gamesAway: 1,
  });
  const injury = (status: PlayerInjury["status"]): PlayerInjury => ({
    status, label: status, injuryType: null, detail: null, side: null, comment: null, expectedReturn: null, since: "2026-10-01", updatedAt: null,
  });

  it("drops players who won't play and flags day-to-day ones", () => {
    const rows = withoutInjured([m(1), m(2), m(3), m(4)], new Map([[1, injury("ir")], [2, injury("out")], [3, injury("day_to_day")]]));
    expect(rows.map((r) => [r.playerId, r.injury?.status ?? null])).toEqual([[3, "day_to_day"], [4, null]]);
  });
});

describe("withCurrentTotals", () => {
  it("replaces the list's stale totals, so a passed milestone drops out", () => {
    const stale = { ...skater, milestone: "Assists", milestoneAmount: 400, assists: 399, gamesPlayed: 750 };
    const fresh = withCurrentTotals(stale, { assists: 406, gamesPlayed: 757 });
    expect(fresh).toMatchObject({ assists: 406, gamesPlayed: 757 });
    expect(toMilestone(fresh, "skater")).toBeNull();
    expect(withCurrentTotals(stale, undefined)).toBe(stale);
  });

  it("maps goalie shutouts", () => {
    expect(withCurrentTotals({ playerId: 2, so: 27 }, { shutouts: 28 }).so).toBe(28);
  });
});
