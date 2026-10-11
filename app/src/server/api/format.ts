import Decimal from "decimal.js";
import { seasonForDate } from "@/server/ingestion/normalize";

// C# Math.Round(decimal, digits): banker's rounding (MidpointRounding.ToEven).
// The double is read through its shortest decimal form, so a value stored as
// numeric 0.125 rounds the way System.Decimal would (0.12), not by its binary
// expansion.
export function round(value: number, digits = 0): number {
  if (!Number.isFinite(value)) return value;
  return new Decimal(value).toDecimalPlaces(digits, Decimal.ROUND_HALF_EVEN).toNumber();
}

export function roundOrNull(value: number | null | undefined, digits = 0): number | null {
  return value === null || value === undefined ? null : round(value, digits);
}

// "2024-25" for 2024.
export function seasonLabel(year: number): string {
  return `${year}-${String((year + 1) % 100).padStart(2, "0")}`;
}

// Port of PlayerHelpers: stored headshot URL, else the NHL mug URL for the
// player's current team in the current season.
export function headshotUrl(playerId: number, storedUrl: string | null, teamAbbreviation: string | null): string | null {
  if (storedUrl) return storedUrl;
  if (!teamAbbreviation) return null;
  const season = seasonForDate(new Date());
  return `https://assets.nhle.com/mugs/nhl/${season}${season + 1}/${teamAbbreviation}/${playerId}.png`;
}

export function sum<T>(items: readonly T[], value: (item: T) => number | null | undefined): number {
  let total = 0;
  for (const item of items) total += value(item) ?? 0;
  return total;
}

export function groupBy<T, K>(items: readonly T[], key: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const group = groups.get(k);
    if (group) group.push(item);
    else groups.set(k, [item]);
  }
  return groups;
}

// Today's date (UTC) as YYYY-MM-DD, like C# DateOnly.FromDateTime(DateTime.UtcNow).
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}
