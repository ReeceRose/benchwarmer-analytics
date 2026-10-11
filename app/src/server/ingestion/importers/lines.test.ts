import { describe, expect, it } from "vitest";
import {
  decodeLineId,
  extractLastName,
  nameKeys,
  parsePlayerNames,
  resolvePlayer,
  type PlayerIndex,
} from "@/server/ingestion/importers/lines";

describe("decodeLineId", () => {
  const known = new Set([8478424, 8480806, 8481754]);

  it("splits concatenated 7-digit player IDs", () => {
    expect(decodeLineId("847842484808068481754", known)).toEqual([8478424, 8480806, 8481754]);
    expect(decodeLineId("84784248480806", known)).toEqual([8478424, 8480806]);
  });

  it("rejects malformed IDs and unknown players", () => {
    expect(decodeLineId("8478424", known)).toBeNull();
    expect(decodeLineId("84784248480806x", known)).toBeNull();
    expect(decodeLineId("84784249999999", known)).toBeNull();
    expect(decodeLineId("8478424848080684817548478424", known)).toBeNull();
  });
});

describe("extractLastName", () => {
  it("keeps name particles", () => {
    expect(extractLastName("James van Riemsdyk")).toBe("van Riemsdyk");
    expect(extractLastName("Martin St. Louis")).toBe("St. Louis");
    expect(extractLastName("Auston Matthews")).toBe("Matthews");
    expect(extractLastName("Sedin")).toBe("Sedin");
    expect(extractLastName("  ")).toBe("");
  });
});

describe("nameKeys", () => {
  it("folds accents and also strips mangled characters", () => {
    expect(nameKeys("Välimäki")).toEqual(["valimaki", "vlimki"]);
    expect(nameKeys("Matthews")).toEqual(["matthews"]);
  });
});

describe("parsePlayerNames", () => {
  const known = new Set(["ekman-larsson", "keller", "matthews", "marner"]);

  it("returns two-part names as-is", () => {
    expect(parsePlayerNames("Matthews-Marner", known)).toEqual(["Matthews", "Marner"]);
  });

  it("greedily rejoins hyphenated last names", () => {
    expect(parsePlayerNames("Ekman-Larsson-Keller", known)).toEqual(["Ekman-Larsson", "Keller"]);
    expect(parsePlayerNames("Matthews-Marner-Nylander", known)).toEqual(["Matthews", "Marner", "Nylander"]);
  });
});

describe("resolvePlayer", () => {
  const index: PlayerIndex = {
    bySeasonTeam: new Map([
      ["nylander|2024|TOR", [{ id: 1, position: "RW" }, { id: 2, position: "LW" }]],
      ["hughes|2024|NJD", [{ id: 3, position: "C" }, { id: 4, position: "D" }]],
    ]),
    byLastName: new Map([
      ["fowler", [{ id: 5, position: "D" }, { id: 6, position: "D" }]],
      ["hughes", [{ id: 3, position: "C" }, { id: 4, position: "D" }, { id: 7, position: "D" }]],
    ]),
    knownLastNames: new Set(["nylander", "hughes", "fowler"]),
    activeInSeason: new Set(["5|2024"]),
    playerIds: new Set([1, 2, 3, 4, 5, 6, 7]),
  };

  it("uses position to break ties within a team", () => {
    expect(resolvePlayer(index, "Hughes", 2024, "NJD", true)).toEqual({ id: 4 });
    expect(resolvePlayer(index, "Hughes", 2024, "NJD", false)).toEqual({ id: 3 });
  });

  it("reports genuine ambiguity", () => {
    expect(resolvePlayer(index, "Nylander", 2024, "TOR", false)).toEqual({ error: "ambiguous" });
  });

  it("falls back to last name, preferring players active that season", () => {
    expect(resolvePlayer(index, "Fowler", 2024, "ANA", true)).toEqual({ id: 5 });
    expect(resolvePlayer(index, "Fowler", 2023, "ANA", true)).toEqual({ error: "ambiguous" });
  });

  it("reports unknown names", () => {
    expect(resolvePlayer(index, "Nobody", 2024, "TOR", false)).toEqual({ error: "not found" });
  });
});
