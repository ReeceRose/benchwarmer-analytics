/**
 * Format ice time seconds to MM:SS format
 * @example formatToi(754) => "12:34"
 */
export function formatToi(seconds: number | null | undefined): string {
  if (seconds == null) return "-";
  const totalSeconds = Math.round(seconds);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format season year to display label
 * @example formatSeason(2024) => "2024-25"
 */
export function formatSeason(year: number): string {
  const nextYear = (year + 1) % 100;
  return `${year}-${nextYear.toString().padStart(2, "0")}`;
}

/**
 * Format decimal as percentage
 * @example formatPercent(0.521) => "52.1%"
 * @example formatPercent(52.1, false) => "52.1%"
 */
export function formatPercent(
  value: number | null | undefined,
  isDecimal = true
): string {
  if (value == null) return "-";
  const pct = isDecimal ? value * 100 : value;
  return `${pct.toFixed(1)}%`;
}

/**
 * Format height in inches to feet and inches
 * @example formatHeight(74) => "6'2\""
 */
export function formatHeight(inches: number | null | undefined): string {
  if (inches == null) return "-";
  const feet = Math.floor(inches / 12);
  const remainingInches = inches % 12;
  return `${feet}'${remainingInches}"`;
}

/**
 * Format weight in pounds
 * @example formatWeight(205) => "205 lbs"
 */
export function formatWeight(lbs: number | null | undefined): string {
  if (lbs == null) return "-";
  return `${lbs} lbs`;
}

/**
 * Format player position to full name
 * @example formatPosition("C") => "Center"
 */
export function formatPosition(position: string | null | undefined): string {
  if (!position) return "-";
  const positions: Record<string, string> = {
    C: "Center",
    L: "Left Wing",
    R: "Right Wing",
    D: "Defense",
    G: "Goalie",
    LW: "Left Wing",
    RW: "Right Wing",
  };
  return positions[position.toUpperCase()] || position;
}

/**
 * Format a stat per 60 minutes of ice time
 * @example formatPer60(5, 3600) => "5.00" (5 goals in 1 hour)
 * @example formatPer60(10, 7200) => "5.00" (10 goals in 2 hours)
 */
export function formatPer60(
  stat: number | null | undefined,
  iceTimeSeconds: number | null | undefined
): string {
  if (stat == null || iceTimeSeconds == null || iceTimeSeconds === 0) return "-";
  const per60 = (stat / iceTimeSeconds) * 3600;
  return per60.toFixed(2);
}

/**
 * Format save percentage in hockey style notation
 * @example formatSavePct(0.915) => ".915"
 * @example formatSavePct(0.8912) => ".891"
 * @example formatSavePct(1.0) => "1.000"
 */
export function formatSavePct(value: number | null | undefined): string {
  if (value == null) return "-";
  if (value >= 1) return value.toFixed(3);
  return `.${(value * 1000).toFixed(0).padStart(3, "0")}`;
}

/**
 * Format ice time seconds to human-readable long format (hours/minutes)
 * @example formatIceTimeLong(7200) => "2h 0m"
 * @example formatIceTimeLong(1800) => "30m"
 */
export function formatIceTimeLong(seconds: number | null | undefined): string {
  if (seconds == null) return "-";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Format game time (seconds from game start) to period and time format
 * @example formatGameTime(1320) => "P2 2:00" (2 mins into 2nd period)
 * @example formatGameTime(600) => "P1 10:00"
 */
export function formatGameTime(gameSeconds: number): string {
  const period = Math.floor(gameSeconds / 1200) + 1;
  const periodSeconds = gameSeconds % 1200;
  const mins = Math.floor(periodSeconds / 60);
  const secs = periodSeconds % 60;
  return `P${period} ${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format TOI per game average
 * @example formatToiPerGame(3600, 3) => "20:00"
 */
export function formatToiPerGame(totalSeconds: number, gamesPlayed: number): string {
  if (gamesPlayed === 0) return "0:00";
  const perGame = totalSeconds / gamesPlayed;
  const mins = Math.floor(perGame / 60);
  const secs = Math.floor(perGame % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Ordinal for a rank
 * @example formatOrdinal(1) => "1st", formatOrdinal(22) => "22nd"
 */
export function formatOrdinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const suffix = ["th", "st", "nd", "rd"][n % 10] ?? "th";
  return `${n}${suffix}`;
}

/**
 * Short position code for dense tables
 * @example formatPositionShort("L") => "LW"
 */
export function formatPositionShort(position: string | null | undefined): string {
  if (!position) return "–";
  const positions: Record<string, string> = { L: "LW", R: "RW" };
  const upper = position.toUpperCase();
  return positions[upper] ?? upper;
}
