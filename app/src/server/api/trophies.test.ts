import { describe, expect, it } from "vitest";
import { groupSeasons, summarisePlayerAwards } from "@/server/api/trophies";
import type { AwardEntry } from "@/types";

const entry = (season: number, status: string, name: string): AwardEntry => ({
  season, status, name, playerId: null, hasPlayerPage: false, team: null, isRookie: false,
});

describe("groupSeasons", () => {
  it("groups newest first, winners first, then runners-up and finalists", () => {
    const seasons = groupSeasons([
      entry(2024, "FINALIST", "C"),
      entry(2025, "WINNER", "A"),
      entry(2024, "WINNER", "B"),
      entry(2024, "RUNNER_UP", "D"),
      entry(2025, "WINNER", "E"),
    ]);
    expect(seasons.map((s) => [s.season, s.winners.map((w) => w.name), s.others.map((o) => o.name)])).toEqual([
      [2025, ["A", "E"], []],
      [2024, ["B"], ["D", "C"]],
    ]);
  });
});

describe("summarisePlayerAwards", () => {
  it("splits wins from finalist seasons and puts the most-won trophy first", () => {
    const awards = summarisePlayerAwards([
      { trophy: "Hart Memorial Trophy", slug: "hart-memorial", season: 2020, status: "WINNER" },
      { trophy: "Hart Memorial Trophy", slug: "hart-memorial", season: 2023, status: "RUNNER_UP" },
      { trophy: "Art Ross Trophy", slug: "art-ross", season: 2019, status: "WINNER" },
      { trophy: "Art Ross Trophy", slug: "art-ross", season: 2022, status: "WINNER" },
      { trophy: "Calder Memorial Trophy", slug: "calder-memorial", season: 2015, status: "FINALIST" },
    ]);
    expect(awards).toEqual([
      { trophy: "Art Ross Trophy", slug: "art-ross", wins: [2022, 2019], finalist: [] },
      { trophy: "Hart Memorial Trophy", slug: "hart-memorial", wins: [2020], finalist: [2023] },
      { trophy: "Calder Memorial Trophy", slug: "calder-memorial", wins: [], finalist: [2015] },
    ]);
  });
});
