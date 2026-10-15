/** ESPN's injury status, normalised. LTIR counts as IR. */
export type InjuryStatus = "ir" | "out" | "day_to_day" | "suspended" | "other";

/** A player's current injury, from ESPN's injury list (refreshed twice a day). */
export interface PlayerInjury {
  status: InjuryStatus;
  /** "IR", "Out", "Day-to-day", "Suspended". */
  label: string;
  /** Body area or reason ("Upper Body", "Knee", "Illness"); null when undisclosed. */
  injuryType: string | null;
  /** "Surgery" and the like. */
  detail: string | null;
  side: string | null;
  /** ESPN's latest one-line update. */
  comment: string | null;
  /** The earliest date ESPN says the player can return (YYYY-MM-DD), not a forecast. */
  earliestReturn: string | null;
  /** First day we saw the player on the list (YYYY-MM-DD). */
  since: string;
  /** When ESPN last updated the entry (ISO). */
  updatedAt: string | null;
}

/** An injured player on a team's list. */
export interface InjuredPlayer {
  /** Our player ID; null for players with no NHL games yet. */
  playerId: number | null;
  name: string;
  position: string | null;
  injury: PlayerInjury;
}

export interface TeamInjuriesResponse {
  team: string;
  /** IR first, then out, day-to-day; newest first within each. */
  injuries: InjuredPlayer[];
}

export type TransactionKind = "ir_place" | "ir_activate" | "trade" | "waivers" | "recall" | "assign" | "sign" | "other";

export interface Transaction {
  date: string;
  team: string;
  kind: TransactionKind;
  description: string;
  playerId: number | null;
}

export interface TransactionsResponse {
  transactions: Transaction[];
}
