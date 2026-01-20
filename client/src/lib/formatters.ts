/**
 * Format ice time seconds to MM:SS format
 * @example formatToi(754) => "12:34"
 */
export function formatToi(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
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
 * Format date string to readable format
 * @example formatDate("1997-01-13") => "Jan 13, 1997"
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
 * Format a stat value with optional comparison to average
 * @example formatStat(52.1, 50.0) => { value: "52.1", trend: "up" }
 */
export function formatStat(
  value: number | null | undefined,
  average?: number | null
): { value: string; trend?: "up" | "down" | "neutral" } {
  if (value == null) return { value: "-" };

  const formattedValue = value.toFixed(1);
  if (average == null) return { value: formattedValue };

  const diff = value - average;
  const threshold = 0.5;

  if (diff > threshold) return { value: formattedValue, trend: "up" };
  if (diff < -threshold) return { value: formattedValue, trend: "down" };
  return { value: formattedValue, trend: "neutral" };
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
 * Format number with commas
 * @example formatNumber(1234567) => "1,234,567"
 */
export function formatNumber(value: number | null | undefined): string {
  if (value == null) return "-";
  return value.toLocaleString();
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
