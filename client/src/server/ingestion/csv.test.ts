import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { convertValue, CsvValueError, parseCsv, type FieldSpec } from "@/server/ingestion/csv";
import { skaterFields, teamExpectedHeaders, teamFields } from "@/server/ingestion/records";

const fixture = (name: string) => fs.readFileSync(path.join(__dirname, "__fixtures__", name), "utf8");

async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const item of iterable) out.push(item);
  return out;
}

describe("convertValue", () => {
  it("parses ints strictly", () => {
    expect(convertValue(" 42 ", "int")).toBe(42);
    expect(() => convertValue("4.0", "int")).toThrow(CsvValueError);
    expect(() => convertValue("", "int")).toThrow(CsvValueError);
    expect(convertValue("", "int?")).toBeNull();
  });

  it("keeps decimals as exact text", () => {
    expect(convertValue("0.123456789012345678901", "decimal")).toBe("0.123456789012345678901");
    expect(convertValue("1e-05", "decimal?")).toBe("1e-05");
    expect(convertValue("", "decimal?")).toBeNull();
    expect(() => convertValue("NaN", "decimal")).toThrow(CsvValueError);
  });

  it("parses doubles to numbers", () => {
    expect(convertValue("12.5", "double")).toBe(12.5);
    expect(() => convertValue("abc", "double")).toThrow(CsvValueError);
  });

  it("maps empty strings to null only for nullable strings", () => {
    expect(convertValue("", "string")).toBe("");
    expect(convertValue("", "string?")).toBeNull();
    expect(convertValue(" A ", "string")).toBe(" A ");
  });
});

describe("parseCsv", () => {
  const fields = [
    { key: "id", column: "id", type: "int" },
    { key: "value", column: "value", type: "decimal?" },
    { key: "label", column: "label", type: "string" },
    { key: "absent", column: "notInFile", type: "decimal" },
  ] as const satisfies readonly FieldSpec[];

  it("binds by header name, strips a BOM, and defaults missing columns", async () => {
    const missing: string[][] = [];
    const rows = await collect(
      parseCsv("﻿label,id,value\nA,1,0.5\nB,2,\n", fields, { onMissingColumns: (c) => missing.push(c) }),
    );
    expect(rows).toEqual([
      { id: 1, value: "0.5", label: "A", absent: "0" },
      { id: 2, value: null, label: "B", absent: "0" },
    ]);
    expect(missing).toEqual([["notInFile"]]);
  });

  it("reports the line and column of bad values", async () => {
    await expect(collect(parseCsv("id,value,label\n1,0.5,A\nx,1,B\n", fields))).rejects.toThrow(/line 3, column id/);
  });

  it("validates headers at bound indexes", async () => {
    const byIndex = [{ key: "a", column: 1, type: "string" }] as const satisfies readonly FieldSpec[];
    await expect(collect(parseCsv("x,y\n1,2\n", byIndex, { expectedHeaders: { 1: "z" } }))).rejects.toThrow(
      /expected header "z" at column 1/,
    );
    expect(await collect(parseCsv("x,y\n1,2\n", byIndex, { expectedHeaders: { 1: "y" } }))).toEqual([{ a: "2" }]);
  });

  it("parses the real teams.csv layout (duplicate team header) by index", async () => {
    const rows = await collect(parseCsv(fixture("teams_2024_sample.csv"), teamFields, { expectedHeaders: teamExpectedHeaders }));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ team: "TOR", season: 2024, name: "TOR", position: "Team Level" });
    expect(typeof rows[0].penaltyMinutesFor).toBe("string");
  });

  it("parses every skaters.csv column from a real row", async () => {
    const missing: string[] = [];
    const rows = await collect(
      parseCsv(fixture("skaters_2024_sample.csv"), skaterFields, { onMissingColumns: (c) => missing.push(...c) }),
    );
    expect(missing).toEqual([]);
    expect(rows.map((r) => r.situation)).toEqual(["other", "all"]);
    expect(rows[1]).toMatchObject({ playerId: 8479318, name: "Auston Matthews", gamesPlayed: 67, iceTime: "82298.0" });
  });
});
