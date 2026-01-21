/**
 * Game-related formatting utilities shared across components
 */

export function formatGameTime(utcTime: string | null): string {
  if (!utcTime) return "TBD";
  const date = new Date(utcTime);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function formatGameTimeShort(utcTime: string | null): string {
  if (!utcTime) return "TBD";
  const date = new Date(utcTime);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
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
