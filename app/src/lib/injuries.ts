import type { InjuryStatus, PlayerInjury, TransactionKind } from "@/types";

const SHORT: Record<InjuryStatus, string> = {
  ir: "IR",
  out: "Out",
  suspended: "Susp",
  day_to_day: "DTD",
  other: "Inj",
};

/** Chip text: "IR", "Out", "DTD", "Susp". */
export const injuryShortLabel = (injury: PlayerInjury) => SHORT[injury.status] ?? "Inj";

/** Statuses that mean the player won't play; day-to-day might. */
export const isOut = (injury: PlayerInjury | null | undefined) =>
  injury != null && (injury.status === "ir" || injury.status === "out" || injury.status === "suspended");

// ESPN title-cases ("Lower Body"); we use sentence case. Acronyms (ACL) stay.
const lowerWords = (s: string) => s.replace(/\b[A-Z][a-z]+\b/g, (w) => w.toLowerCase());
const sentence = (s: string) => {
  const lowered = lowerWords(s);
  return lowered.charAt(0).toUpperCase() + lowered.slice(1);
};

/** "Left knee (surgery)", "Upper body", "Undisclosed". */
export function injuryReason(injury: PlayerInjury): string {
  const type = injury.injuryType;
  if (!type) return "Undisclosed";
  const body = sentence(injury.side ? `${injury.side} ${type}` : type);
  return injury.detail ? `${body} (${lowerWords(injury.detail)})` : body;
}

/** "Oct 16" from YYYY-MM-DD, read at noon so time zones can't shift the day. */
export function shortDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * "Oct 16": the earliest date ESPN says the player can return (end of an IR
 * stint, next game for day-to-day), not when they will. Null when ESPN gives
 * no date or it has passed.
 */
export function earliestReturn(injury: PlayerInjury, today = new Date().toISOString().slice(0, 10)): string | null {
  if (!injury.earliestReturn || injury.earliestReturn < today) return null;
  return shortDate(injury.earliestReturn);
}

/** One line for hover text and lists: "IR · Left knee (surgery) · Earliest return Oct 16". */
export function describeInjury(injury: PlayerInjury): string {
  const earliest = earliestReturn(injury);
  return [injury.label, injuryReason(injury), earliest && `Earliest return ${earliest}`].filter(Boolean).join(" · ");
}

export const TRANSACTION_LABELS: Record<TransactionKind, string> = {
  ir_place: "To IR",
  ir_activate: "Off IR",
  trade: "Trade",
  waivers: "Waivers",
  recall: "Recalled",
  assign: "Assigned",
  sign: "Signed",
  other: "Other",
};
