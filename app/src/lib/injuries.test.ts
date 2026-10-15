import { describe, expect, it } from "vitest";
import { describeInjury, expectedBack, injuryReason } from "@/lib/injuries";
import type { PlayerInjury } from "@/types";

const injury = (overrides: Partial<PlayerInjury> = {}): PlayerInjury => ({
  status: "ir", label: "IR", injuryType: "Lower Body", detail: null, side: null, comment: null,
  expectedReturn: null, since: "2026-10-01", updatedAt: null, ...overrides,
});

describe("injury text", () => {
  it("uses sentence case and keeps acronyms", () => {
    expect(injuryReason(injury())).toBe("Lower body");
    expect(injuryReason(injury({ injuryType: "Knee", side: "Left", detail: "Surgery" }))).toBe("Left knee (surgery)");
    expect(injuryReason(injury({ injuryType: "ACL" }))).toBe("ACL");
    expect(injuryReason(injury({ injuryType: null }))).toBe("Undisclosed");
  });

  it("only gives a return date that's still ahead", () => {
    expect(expectedBack(injury({ expectedReturn: "2026-10-20" }), "2026-10-14")).toBe("Expected back Oct 20");
    expect(expectedBack(injury({ expectedReturn: "2026-10-01" }), "2026-10-14")).toBeNull();
    expect(describeInjury(injury({ expectedReturn: "2026-10-20" }))).toMatch(/^IR · Lower body/);
  });
});
