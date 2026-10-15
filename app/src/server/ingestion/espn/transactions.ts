// ESPN's league transactions → transactions. ESPN gives only a date, team and
// free text, so the text is the key, and the kind and player are parsed from
// it on a best-effort basis (anything unrecognised is "other" with no player).

import { transactions } from "@/server/db/schema";
import { upsert, type Queryable } from "@/server/ingestion/db";
import { fetchTransactions, teamCode, type EspnTransaction } from "@/server/ingestion/espn/client";
import { PlayerIndex } from "@/server/ingestion/espn/players";
import type { Logger } from "@/server/ingestion/sync-runs";
import type { TransactionKind } from "@/types";


// Most specific first: a sentence that mentions injured reserve is an IR move
// even if it also says "assigned".
const KIND_PATTERNS: [TransactionKind, RegExp][] = [
  ["ir_activate", /\b(activated|reinstated|returned|removed)\b.*\binjured\b/i],
  ["ir_place", /\binjured (reserve|list)\b|\binjured, reserve\b/i],
  ["trade", /\b(acquired|traded)\b/i],
  ["waivers", /\b(waivers|waived)\b/i],
  ["recall", /\brecalled\b/i],
  ["assign", /\b(assigned|reassigned|loaned|sent|returned)\b/i],
  ["sign", /\b(signed|agreed to terms|re-signed)\b/i],
];

// A position (C, LW, D, "C/RW", plural "Ds") then a name: capitalised words,
// plus lowercase particles ("van Riemsdyk").
const PLAYER_PATTERN =
  /\b(?:LW|RW|[CDGFW])(?:\/(?:LW|RW|[CDGFW]))*s?\s+(\p{Lu}[\p{L}'’.-]*(?:\s+(?:\p{Lu}[\p{L}'’.-]*|(?:van|von|de|del|der|da|di|la|le)(?=\s+\p{Lu})))*)/gu;

/** Player names in the order they appear. */
export function extractPlayerNames(text: string): string[] {
  return [...text.matchAll(PLAYER_PATTERN)].map((m) => m[1].replace(/[.]$/, "").trim());
}

const sentences = (text: string) => text.split(/(?<=[.;])\s+/).filter(Boolean);

/** The transaction's kind and the player it's about (from the sentence that sets the kind). */
export function classifyTransaction(text: string): { kind: TransactionKind; playerName: string | null } {
  const parts = sentences(text);
  for (const [kind, pattern] of KIND_PATTERNS) {
    const sentence = parts.find((s) => pattern.test(s));
    if (sentence) return { kind, playerName: extractPlayerNames(sentence)[0] ?? null };
  }
  return { kind: "other", playerName: extractPlayerNames(text)[0] ?? null };
}

export function toTransactionRows(entries: readonly EspnTransaction[], index: PlayerIndex) {
  const rows = [];
  let skipped = 0;
  for (const t of entries) {
    const team = teamCode(t.team.abbreviation);
    const date = t.date.slice(0, 10);
    if (!team || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      skipped++;
      continue;
    }
    const description = t.description.trim();
    const { kind, playerName } = classifyTransaction(description);
    rows.push({
      transactionDate: date,
      team,
      description,
      kind,
      playerName,
      playerId: playerName ? index.match(playerName, { team }).playerId : null,
    });
  }
  return { rows, skipped };
}

/** Transactions dated [start, end] (YYYY-MM-DD). */
export async function importTransactions(db: Queryable, start: string, end: string, logger: Logger) {
  const fetched = await fetchTransactions(start, end);
  const index = await PlayerIndex.load(db);
  const { rows, skipped } = toTransactionRows(fetched.entries, index);
  const written = await upsert(db, transactions, rows, { conflict: ["transactionDate", "team", "description"] });
  const result = {
    fetched: fetched.entries.length,
    written,
    skipped: skipped + fetched.skipped,
    withPlayer: rows.filter((r) => r.playerId !== null).length,
  };
  logger.info(`espn_transactions ${start}..${end}: ${JSON.stringify(result)}`);
  return result;
}
