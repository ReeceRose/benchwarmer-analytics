import { describe, expect, it } from "vitest";
import {
  doubleToDecimal,
  normalizePosition,
  normalizeTeam,
  roundHalfEven,
  seasonForDate,
  toNhlGameId,
  truncInt,
} from "@/server/ingestion/normalize";

describe("normalizeTeam", () => {
  it("maps MoneyPuck dotted codes to NHL codes, case-insensitively", () => {
    expect(normalizeTeam("L.A")).toBe("LAK");
    expect(normalizeTeam("n.j")).toBe("NJD");
    expect(normalizeTeam("S.J")).toBe("SJS");
    expect(normalizeTeam("T.B")).toBe("TBL");
  });

  it("leaves other codes, blanks and null unchanged", () => {
    expect(normalizeTeam("TOR")).toBe("TOR");
    expect(normalizeTeam("  ")).toBe("  ");
    expect(normalizeTeam(null)).toBeNull();
  });
});

describe("normalizePosition", () => {
  it("expands L/R and upper-cases", () => {
    expect(normalizePosition("L")).toBe("LW");
    expect(normalizePosition(" r ")).toBe("RW");
    expect(normalizePosition("c")).toBe("C");
    expect(normalizePosition("D")).toBe("D");
  });

  it("returns null for blank input", () => {
    expect(normalizePosition("")).toBeNull();
    expect(normalizePosition(null)).toBeNull();
  });
});

describe("toNhlGameId", () => {
  it("builds season + type + 4-digit game number", () => {
    expect(toNhlGameId("20004", 2025)).toBe("2025020004");
    expect(toNhlGameId("21312", 2024)).toBe("2024021312");
    expect(toNhlGameId("30141", 2024)).toBe("2024030141");
  });

  it("pads short game numbers and passes through invalid IDs", () => {
    expect(toNhlGameId("21", 2010)).toBe("2010020001");
    expect(toNhlGameId("2", 2010)).toBe("2");
  });
});

describe("numeric helpers", () => {
  it("truncInt truncates toward zero like a C# int cast", () => {
    expect(truncInt("82298.9")).toBe(82298);
    expect(truncInt(-1.7)).toBe(-1);
    expect(truncInt("0.0")).toBe(0);
  });

  it("roundHalfEven uses banker's rounding like C# Math.Round", () => {
    expect(roundHalfEven("0.0625", 3)).toBe("0.062");
    expect(roundHalfEven("0.0635", 3)).toBe("0.064");
    expect(roundHalfEven("2.5", 0)).toBe("2");
    expect(roundHalfEven("3.5", 0)).toBe("4");
    expect(roundHalfEven("1.23456", 4)).toBe("1.2346");
  });

  it("doubleToDecimal keeps at most 15 significant digits like (decimal)double", () => {
    expect(doubleToDecimal(0.1 + 0.2)).toBe("0.3");
    expect(doubleToDecimal(12.5)).toBe("12.5");
    expect(doubleToDecimal(1 / 3)).toBe("0.333333333333333");
  });
});

describe("seasonForDate", () => {
  it("starts a new season in October", () => {
    expect(seasonForDate(new Date("2025-09-30T12:00:00Z"))).toBe(2024);
    expect(seasonForDate(new Date("2025-10-01T00:00:00Z"))).toBe(2025);
    expect(seasonForDate(new Date("2026-04-15T00:00:00Z"))).toBe(2025);
  });
});
