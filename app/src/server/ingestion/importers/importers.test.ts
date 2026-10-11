import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { parseCsv } from "@/server/ingestion/csv";
import { parseBirthDate, parseHeight, parseName } from "@/server/ingestion/importers/bios";
import { goalieDerived } from "@/server/ingestion/importers/goalies";
import { mapShot } from "@/server/ingestion/importers/shots";
import { per60, savePct, shootingPct, singleSeason } from "@/server/ingestion/importers/skaters";
import { unzipFirstCsv } from "@/server/ingestion/moneypuck";
import { shotFields } from "@/server/ingestion/records";

const fixture = (name: string) => fs.readFileSync(path.join(__dirname, "..", "__fixtures__", name), "utf8");

describe("skater derived stats", () => {
  it("per60 rounds half-even to 3 places and needs ice time", () => {
    expect(per60("10", 3600)).toBe("10");
    expect(per60("1", 7)).toBe("514.286");
    expect(per60(null, 100)).toBeNull();
    expect(per60("1", 0)).toBeNull();
  });

  it("on-ice percentages round to 4 places and clamp to [0, 1]", () => {
    expect(shootingPct("10", "95")).toBe("0.1053");
    expect(shootingPct("5", "0")).toBeNull();
    expect(savePct("10", "100")).toBe("0.9");
    expect(savePct("-5", "10")).toBe("1");
    expect(savePct(null, "10")).toBeNull();
  });

  it("singleSeason rejects mixed files", () => {
    expect(singleSeason([{ season: 2024 }, { season: 2024 }])).toBe(2024);
    expect(() => singleSeason([{ season: 2024 }, { season: 2023 }])).toThrow();
  });
});

describe("goalieDerived", () => {
  it("computes save %, GAA per 60 and GSAx", () => {
    expect(goalieDerived(2, 20, 3600, "3.5")).toEqual({
      savePercentage: "0.9",
      goalsAgainstAverage: "2",
      goalsSavedAboveExpected: "1.5",
    });
    expect(goalieDerived(0, 0, 0, null)).toEqual({ savePercentage: null, goalsAgainstAverage: null, goalsSavedAboveExpected: null });
  });
});

describe("bio parsing", () => {
  it("splits names on the first space", () => {
    expect(parseName("A.J. Greer")).toEqual({ firstName: "A.J.", lastName: "Greer" });
    expect(parseName("James van Riemsdyk")).toEqual({ firstName: "James", lastName: "van Riemsdyk" });
    expect(parseName("Sedin")).toEqual({ firstName: null, lastName: "Sedin" });
  });

  it("parses height and birth date", () => {
    expect(parseHeight(`6' 3"`)).toBe(75);
    expect(parseHeight("5'11")).toBe(71);
    expect(parseHeight(null)).toBeNull();
    expect(parseBirthDate("1996-12-14")).toBe("1996-12-14");
    expect(parseBirthDate("1996-02-30")).toBeNull();
    expect(parseBirthDate("")).toBeNull();
  });
});

describe("mapShot", () => {
  it("maps a real MoneyPuck shot row", async () => {
    const records = [];
    for await (const r of parseCsv(fixture("shots_2024_sample.csv"), shotFields)) records.push(r);
    const row = mapShot(records[0]);
    expect(row).toMatchObject({
      shotId: "0",
      gameId: "2024020001",
      season: 2024,
      isPlayoffGame: false,
      homeTeamCode: "BUF",
      awayTeamCode: "NJD",
      teamCode: "NJD",
      isHomeTeam: false,
      shooterPlayerId: 8483495,
    });
    expect(typeof row.isGoal).toBe("boolean");
    expect(typeof row.xGoal).toBe("string");
    expect(Object.keys(row)).toHaveLength(135);
  });
});

describe("unzipFirstCsv", () => {
  it("streams the CSV entry out of a zip", async () => {
    const zip = zipSync({ "readme.txt": strToU8("ignore"), "shots_2024.csv": strToU8("a,b\n1,2\n") });
    const chunks: Uint8Array[] = [];
    const source = Readable.from([zip.subarray(0, 10), zip.subarray(10)]);
    for await (const chunk of unzipFirstCsv(source)) chunks.push(chunk);
    expect(Buffer.concat(chunks).toString()).toBe("a,b\n1,2\n");
  });

  it("fails when there is no CSV", async () => {
    const zip = zipSync({ "readme.txt": strToU8("nothing") });
    await expect(async () => {
      for await (const chunk of unzipFirstCsv(Readable.from([zip]))) void chunk;
    }).rejects.toThrow(/no CSV/);
  });
});
