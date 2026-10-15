import { describe, expect, it } from "vitest";
import { daysSinceGameDate } from "@/lib/game-formatters";

describe("daysSinceGameDate", () => {
  it("counts days in ET, not UTC", () => {
    // 02:00 UTC on Oct 15 is still Oct 14 in New York.
    const now = new Date("2026-10-15T02:00:00Z");
    expect(daysSinceGameDate("2026-10-14", now)).toBe(0);
    expect(daysSinceGameDate("2026-10-13", now)).toBe(1);
    expect(daysSinceGameDate("2026-10-07", now)).toBe(7);
  });

  it("is unaffected by DST changes", () => {
    expect(daysSinceGameDate("2026-11-01", new Date("2026-11-02T15:00:00Z"))).toBe(1);
  });
});
