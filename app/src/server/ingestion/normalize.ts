import Decimal from "decimal.js";

// Decimal configured like System.Decimal (28-29 significant digits) with
// banker's rounding, the default for C# Math.Round.
export const CsDecimal = Decimal.clone({ precision: 28, rounding: Decimal.ROUND_HALF_EVEN });

// MoneyPuck uses period-separated abbreviations for four teams; everything is
// stored in standard NHL form. Port of TeamAbbreviationNormalizer.
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

// MoneyPuck skater positions (L/R) to LW/RW. Port of SkaterImporter.NormalizePosition.
export function normalizePosition(position: string | null): string | null {
  if (position === null || position.trim() === "") return null;
  const upper = position.trim().toUpperCase();
  if (upper === "L") return "LW";
  if (upper === "R") return "RW";
  return upper;
}

// MoneyPuck game_id "20004" (type digit + game number) to the NHL API form
// "2024020004" (season + 2-digit type + 4-digit number). Port of
// ShotImporter.ConvertToNhlGameId.
export function toNhlGameId(moneyPuckGameId: string, season: number): string {
  if (moneyPuckGameId.length < 2) return moneyPuckGameId;
  const type = moneyPuckGameId[0] === "3" ? "03" : "02";
  return `${season}${type}${moneyPuckGameId.slice(1).padStart(4, "0")}`;
}

// C# (int)decimal / (int)double: truncate toward zero.
export function truncInt(value: string | number): number {
  return Math.trunc(typeof value === "number" ? value : Number(value));
}

// C# (decimal)double: rounds to at most 15 significant digits.
export function doubleToDecimal(value: number): string {
  return new CsDecimal(value).toSignificantDigits(15).toString();
}

// C# Math.Round(decimal, digits) with the default MidpointRounding.ToEven.
export function roundHalfEven(value: Decimal.Value, digits: number): string {
  return new CsDecimal(value).toDecimalPlaces(digits, Decimal.ROUND_HALF_EVEN).toString();
}

export function toDecimal(value: Decimal.Value): Decimal {
  return new CsDecimal(value);
}

// NHL season start year for a date: October onward is the new season.
// Port of the C# GetCurrentSeason helpers.
export function seasonForDate(date: Date): number {
  return date.getUTCMonth() >= 9 ? date.getUTCFullYear() : date.getUTCFullYear() - 1;
}

export function currentSeason(): number {
  return seasonForDate(new Date());
}
