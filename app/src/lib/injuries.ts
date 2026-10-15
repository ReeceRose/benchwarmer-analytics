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

/** "Expected back Oct 16", or null when ESPN gives no date or it has passed. */
export function expectedBack(injury: PlayerInjury, today = new Date().toISOString().slice(0, 10)): string | null {
  if (!injury.expectedReturn || injury.expectedReturn < today) return null;
  return `Expected back ${shortDate(injury.expectedReturn)}`;
}

/** One line for hover text and lists: "IR · Left knee (surgery) · Expected back Oct 16". */
export function describeInjury(injury: PlayerInjury): string {
  return [injury.label, injuryReason(injury), expectedBack(injury)].filter(Boolean).join(" · ");
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
