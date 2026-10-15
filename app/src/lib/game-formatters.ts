/**
 * Game-related formatting utilities shared across components
 * All times are displayed in Eastern Time (ET) since NHL schedules are ET-centric
 */

const ET_TIMEZONE = "America/New_York";

export function formatGameTime(utcTime: string | null): string {
  if (!utcTime) return "TBD";
  const date = new Date(utcTime);
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: ET_TIMEZONE,
  });
  return `${timeStr} ET`;
}

export function formatGameTimeShort(utcTime: string | null): string {
  if (!utcTime) return "TBD";
  const date = new Date(utcTime);
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: ET_TIMEZONE,
  });
  return `${timeStr} ET`;
}

export function formatGameDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatGameDateLong(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatPeriod(
  period: number | null | undefined,
  inIntermission?: boolean | null
): string {
  if (!period) return "";
  if (inIntermission) return "INT";
  const ordinals = ["", "1st", "2nd", "3rd", "OT", "SO"];
  return ordinals[period] || `${period}OT`;
}

export function getSeasonFromDate(dateStr: string): number {
  // NHL seasons span two years (e.g., 2025-26 season starts in Oct 2025)
  // Season is identified by the starting year
  const date = new Date(dateStr + "T12:00:00");
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed
  // If month is before October (0-9 = Jan-Oct), it's the previous year's season
  return month < 9 ? year - 1 : year;
}

/** The ET calendar date (YYYY-MM-DD) of a UTC timestamp: the NHL's game date. */
export function easternDate(utcTime: string): string {
  return new Date(utcTime).toLocaleDateString("en-CA", { timeZone: ET_TIMEZONE });
}

/** Whole days from an ET game date (YYYY-MM-DD) to today's ET date: 1 for last night. */
export function daysSinceGameDate(dateStr: string, now: Date = new Date()): number {
  const today = easternDate(now.toISOString());
  return Math.round((Date.parse(today) - Date.parse(dateStr)) / 86_400_000);
}
