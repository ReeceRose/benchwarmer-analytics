import Decimal from "decimal.js";

// Decimal with 28 significant digits and banker's rounding, for exact
// derived stats.
export const ExactDecimal = Decimal.clone({ precision: 28, rounding: Decimal.ROUND_HALF_EVEN });

// MoneyPuck uses period-separated abbreviations for four teams; everything is
// stored in standard NHL form.
const TEAM_ABBREVIATIONS: Record<string, string> = {
  "L.A": "LAK",
  "N.J": "NJD",
  "S.J": "SJS",
  "T.B": "TBL",
};

export function normalizeTeam(abbreviation: string): string;
export function normalizeTeam(abbreviation: string | null): string | null;
export function normalizeTeam(abbreviation: string | null): string | null {
  if (abbreviation === null || abbreviation.trim() === "") return abbreviation;
  return TEAM_ABBREVIATIONS[abbreviation.toUpperCase()] ?? abbreviation;
}

// MoneyPuck skater positions (L/R) to LW/RW.
export function normalizePosition(position: string | null): string | null {
  if (position === null || position.trim() === "") return null;
  const upper = position.trim().toUpperCase();
  if (upper === "L") return "LW";
  if (upper === "R") return "RW";
  return upper;
}

// MoneyPuck game_id "20004" (type digit + game number) to the NHL API form
// "2024020004" (season + 2-digit type + 4-digit number).
export function toNhlGameId(moneyPuckGameId: string, season: number): string {
  if (moneyPuckGameId.length < 2) return moneyPuckGameId;
  const type = moneyPuckGameId[0] === "3" ? "03" : "02";
  return `${season}${type}${moneyPuckGameId.slice(1).padStart(4, "0")}`;
}

// Integer part of a number or numeric text, truncated toward zero.
export function truncInt(value: string | number): number {
  return Math.trunc(typeof value === "number" ? value : Number(value));
}

// A double as decimal text with at most 15 significant digits (drops float
// noise such as 0.30000000000000004).
export function doubleToDecimal(value: number): string {
  return new ExactDecimal(value).toSignificantDigits(15).toString();
}

// Banker's rounding (half to even) to `digits` places.
export function roundHalfEven(value: Decimal.Value, digits: number): string {
  return new ExactDecimal(value).toDecimalPlaces(digits, Decimal.ROUND_HALF_EVEN).toString();
}

export function toDecimal(value: Decimal.Value): Decimal {
  return new ExactDecimal(value);
}

// NHL season start year for a date: October onward is the new season.
export function seasonForDate(date: Date): number {
  return date.getUTCMonth() >= 9 ? date.getUTCFullYear() : date.getUTCFullYear() - 1;
}

export function currentSeason(): number {
  return seasonForDate(new Date());
}
