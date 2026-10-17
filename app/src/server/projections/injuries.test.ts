import { describe, expect, it } from "vitest";
import { outlookGap, REPLACEMENT_TALENT, XGA_PER_GAME } from "@/lib/projections/goalie-outlook";
import { GoalieTable, type GoalieGame } from "@/server/projections/goalies";
import { goalieOutlooks, type InjuredGoalie } from "@/server/projections/injuries";
import type { InjuryStatus } from "@/types";

const row = (gameId: string, team: string, goalie: number, xga: number, goals: number): GoalieGame => ({ season: 2026, gameId, team, goalie, shots: 30, xga, goals });

const hurt = (playerId: number, team: string, status: InjuryStatus, earliestReturn: string | null): InjuredGoalie => ({
  playerId,
  name: `G${playerId}`,
  team,
  injury: { status, label: status, injuryType: null, detail: null, side: null, comment: null, earliestReturn, since: "2026-10-15", updatedAt: null },
});

// Goalie 1 (good) started twice for AAA, goalie 2 (worse) once; goalie 3 started for BBB.
function table() {
  const t = new GoalieTable({ decay: 1, shrinkXg: 0 });
  t.addGame([row("1", "AAA", 1, 3, 1), row("1", "BBB", 3, 3, 3)]);
  t.addGame([row("2", "AAA", 1, 3, 1), row("2", "BBB", 3, 3, 3)]);
  t.addGame([row("3", "AAA", 2, 3, 3), row("3", "BBB", 3, 3, 3)]);
  return t;
}

describe("goalieOutlooks", () => {
  it("hands an injured starter's games to the backup until his earliest return", () => {
    const t = table();
    const outlook = goalieOutlooks(t, new Map(), [hurt(1, "AAA", "ir", "2026-11-01")], "2026-10-15").get("AAA")!;
    const usual = t.team("AAA");
    expect(outlookGap(outlook, "2026-10-20")).toBeCloseTo(t.talent(2) * XGA_PER_GAME - usual);
    expect(outlookGap(outlook, "2026-11-01")).toBeCloseTo(0);
  });

  it("leaves teams alone when their goalies are only day-to-day", () => {
    expect(goalieOutlooks(table(), new Map(), [hurt(1, "AAA", "day_to_day", null)], "2026-10-15").has("AAA")).toBe(false);
  });

  it("falls back to a replacement-level goalie when nobody with starts is healthy", () => {
    const t = table();
    const outlook = goalieOutlooks(t, new Map(), [hurt(3, "BBB", "out", null)], "2026-10-15").get("BBB")!;
    expect(outlookGap(outlook, "2026-10-16")).toBeCloseTo((REPLACEMENT_TALENT - t.talent(3)) * XGA_PER_GAME);
    // Back after the assumed two weeks.
    expect(outlookGap(outlook, "2026-10-29")).toBeCloseTo(0);
  });

  it("counts last season's starts for an injured goalie who hasn't played yet", () => {
    const t = table();
    t.addGame([row("4", "CCC", 9, 3, 0)]);
    // Goalie 9 is listed with AAA, had 40 starts there last season, and returns Oct 20.
    const outlook = goalieOutlooks(t, new Map([["AAA", new Map([[9, 40]])]]), [hurt(9, "AAA", "ir", "2026-10-20")], "2026-10-15").get("AAA")!;
    expect(outlookGap(outlook, "2026-10-16")).toBeCloseTo(0);
    expect(outlookGap(outlook, "2026-10-21")).toBeGreaterThan(0);
  });
});
