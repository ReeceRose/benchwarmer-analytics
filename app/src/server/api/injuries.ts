// Current injuries (open stints in player_injuries) and transactions, from
// ESPN via the espn-* crons. Every endpoint that shows availability goes
// through `injuriesByPlayer` so "injured" means the same thing everywhere.

import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import { playerInjuries, transactions } from "@/server/db/schema";
import type { ApiContext } from "@/server/api/handler";
import { requireTeam } from "@/server/api/teams";
import { todayEastern } from "@/server/ingestion/nhl";
import type { InjuredPlayer, InjuryStatus, PlayerInjury, TeamInjuriesResponse, Transaction, TransactionKind, TransactionsResponse } from "@/types";

type InjuryRow = typeof playerInjuries.$inferSelect;

const LABELS: Record<InjuryStatus, string> = {
  ir: "IR",
  out: "Out",
  suspended: "Suspended",
  day_to_day: "Day-to-day",
  other: "Injured",
};

// Most serious first.
const ORDER: Record<InjuryStatus, number> = { ir: 0, out: 1, suspended: 2, day_to_day: 3, other: 4 };

export function toPlayerInjury(row: InjuryRow): PlayerInjury {
  const status = row.status as InjuryStatus;
  return {
    status,
    label: LABELS[status] ?? "Injured",
    injuryType: row.injuryType,
    detail: row.detail,
    side: row.side,
    comment: row.comment,
    earliestReturn: row.expectedReturn,
    // The first run that saw them, or ESPN's last update if that's earlier
    // (players already listed when tracking began). ET, like game dates.
    since: todayEastern(row.reportedAt && row.reportedAt < row.firstSeenAt ? row.reportedAt : row.firstSeenAt),
    updatedAt: row.reportedAt?.toISOString() ?? null,
  };
}

export function compareInjuries(a: InjuryRow, b: InjuryRow): number {
  return (
    ORDER[a.status as InjuryStatus] - ORDER[b.status as InjuryStatus] ||
    (b.reportedAt?.getTime() ?? 0) - (a.reportedAt?.getTime() ?? 0) ||
    a.playerName.localeCompare(b.playerName)
  );
}

/** Current injury for each of the given players that has one. */
export async function injuriesByPlayer(db: Database, playerIds: readonly number[]): Promise<Map<number, PlayerInjury>> {
  const ids = [...new Set(playerIds)];
  if (ids.length === 0) return new Map();
  const rows = await db
    .select()
    .from(playerInjuries)
    .where(and(isNull(playerInjuries.resolvedAt), inArray(playerInjuries.playerId, ids)));
  return new Map(rows.map((r) => [r.playerId!, toPlayerInjury(r)]));
}

export async function playerInjury(db: Database, playerId: number): Promise<PlayerInjury | null> {
  return (await injuriesByPlayer(db, [playerId])).get(playerId) ?? null;
}

/** A team's injured players, most serious first. */
export async function teamInjuries(db: Database, team: string): Promise<InjuredPlayer[]> {
  const rows = await db
    .select()
    .from(playerInjuries)
    .where(and(isNull(playerInjuries.resolvedAt), eq(playerInjuries.team, team)));
  return rows.sort(compareInjuries).map((r) => ({
    playerId: r.playerId,
    name: r.playerName,
    position: r.position,
    injury: toPlayerInjury(r),
  }));
}

export async function getTeamInjuries({ db, params }: ApiContext): Promise<TeamInjuriesResponse> {
  const team = await requireTeam(db, params.abbrev);
  return { team: team.abbreviation, injuries: await teamInjuries(db, team.abbreviation) };
}

const toTransaction = (r: typeof transactions.$inferSelect): Transaction => ({
  date: r.transactionDate,
  team: r.team,
  kind: r.kind as TransactionKind,
  description: r.description,
  playerId: r.playerId,
});

const transactionOrder = [desc(transactions.transactionDate), desc(transactions.id)];

export async function getTeamTransactions({ db, params, query }: ApiContext): Promise<TransactionsResponse> {
  const team = await requireTeam(db, params.abbrev);
  const limit = Math.min(Math.max(query.int("limit") ?? 25, 1), 100);
  const rows = await db
    .select()
    .from(transactions)
    .where(eq(transactions.team, team.abbreviation))
    .orderBy(...transactionOrder)
    .limit(limit);
  return { transactions: rows.map(toTransaction) };
}

/** A player's most recent transactions, newest first. */
export async function playerTransactions(db: Database, playerId: number, limit = 10): Promise<Transaction[]> {
  const rows = await db
    .select()
    .from(transactions)
    .where(eq(transactions.playerId, playerId))
    .orderBy(...transactionOrder)
    .limit(limit);
  return rows.map(toTransaction);
}
