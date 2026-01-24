// Format date as YYYY-MM-DD in local timezone
export function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getYesterdayDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatLocalDate(d);
}

export function getTodayDate(): string {
  return formatLocalDate(new Date());
}

export function getTomorrowDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return formatLocalDate(d);
}

/**
 * Get the NHL season year for a given date.
 * NHL seasons run from October to June, so:
 * - Oct-Dec: season = current year (e.g., Oct 2024 = 2024-25 season = 2024)
 * - Jan-Sep: season = previous year (e.g., Jan 2025 = 2024-25 season = 2024)
 */
export function getSeasonFromDate(date: Date = new Date()): number {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed (0 = January)
  return month < 9 ? year - 1 : year; // Before October = previous season
}

/**
 * Get the current NHL season year based on today's date.
 * Useful as a default when seasons data hasn't loaded yet.
 */
export function getCurrentSeason(): number {
  return getSeasonFromDate(new Date());
}
