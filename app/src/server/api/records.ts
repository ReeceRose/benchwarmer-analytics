// The rest of the NHL records data: franchise people, milestone moments, the
// Hall of Fame, goalie playoff records, officials, attendance and draft
// lotteries (refreshed weekly by /api/cron/history).

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import {
  coaches,
  draftLotteries,
  franchisePeople,
  hallOfFame,
  leagueAttendance,
  milestoneMoments,
  officials,
  playerCareers,
  players,
} from "@/server/db/schema";
import type { ApiContext } from "@/server/api/handler";
import { HttpError } from "@/server/api/errors";
import type {
  AttendanceResponse,
  DraftLottery,
  FranchisePeople,
  GoaliePlayoffRecord,
  MilestoneClubResponse,
  MilestoneKind,
  MilestoneMoment,
  OfficialsResponse,
} from "@/types";

export const MILESTONE_KINDS: Record<MilestoneKind, { label: string; noun: string }> = {
  "points-1000": { label: "1,000 career points", noun: "1,000th point" },
  "goals-500": { label: "500 career goals", noun: "500th goal" },
  "season-points-100": { label: "100-point seasons", noun: "100th point of the season" },
  "season-goals-50": { label: "50-goal seasons", noun: "50th goal of the season" },
};

const isKind = (k: string | undefined): k is MilestoneKind => k !== undefined && k in MILESTONE_KINDS;

type MomentRow = typeof milestoneMoments.$inferSelect;

export function toMoment(m: MomentRow, hasPlayerPage: boolean): MilestoneMoment {
  return {
    kind: m.kind as MilestoneKind,
    playerId: m.playerId,
    name: m.name,
    hasPlayerPage,
    season: m.season,
    gameId: m.gameId,
    gameDate: m.gameDate,
    team: m.teamName,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    ageYears: m.ageYears,
    gamesPlayed: m.gamesPlayed,
    seasonTotal: m.seasonTotal,
    goalie: m.goalieName,
    active: m.isActive,
  };
}

export async function getMilestoneClub({ db, query }: ApiContext): Promise<MilestoneClubResponse> {
  const raw = query.string("kind") ?? "points-1000";
  if (!isKind(raw)) throw new HttpError(400, { error: `kind must be one of ${Object.keys(MILESTONE_KINDS).join(", ")}`, code: "INVALID_PARAMETER" });
  const rows = await db
    .select({ m: milestoneMoments, hasPlayerPage: sql<boolean>`${players.id} is not null` })
    .from(milestoneMoments)
    .leftJoin(players, eq(players.id, milestoneMoments.playerId))
    .where(eq(milestoneMoments.kind, raw))
    .orderBy(desc(milestoneMoments.gameDate));
  const counts = await db
    .select({ kind: milestoneMoments.kind, count: sql<number>`count(*)`.mapWith(Number) })
    .from(milestoneMoments)
    .groupBy(milestoneMoments.kind);
  return {
    kind: raw,
    label: MILESTONE_KINDS[raw].label,
    counts: Object.fromEntries(counts.map((c) => [c.kind, c.count])) as Record<MilestoneKind, number>,
    moments: rows.map((r) => toMoment(r.m, r.hasPlayerPage === true)),
  };
}

/** A player's milestone moments (oldest first), Hall of Fame year and goalie playoff record. */
export async function playerRecords(db: Database, playerId: number) {
  const [moments, hof, career] = await Promise.all([
    db.select().from(milestoneMoments).where(eq(milestoneMoments.playerId, playerId)).orderBy(asc(milestoneMoments.gameDate)),
    db.select().from(hallOfFame).where(eq(hallOfFame.playerId, playerId)).limit(1),
    db.select().from(playerCareers).where(eq(playerCareers.playerId, playerId)).limit(1),
  ]);
  const c = career[0];
  const goaliePlayoffs: GoaliePlayoffRecord | null =
    c?.playoffGames != null && c.playoffGames > 0
      ? {
          games: c.playoffGames,
          gameSevenWins: c.gameSevenWins ?? 0,
          gameSevenLosses: c.gameSevenLosses ?? 0,
          overtimeWins: c.playoffOvertimeWins ?? 0,
          overtimeLosses: c.playoffOvertimeLosses ?? 0,
          overtimeSavePct: c.playoffOvertimeSavePct ?? null,
        }
      : null;
  return {
    milestones: moments.map((m) => toMoment(m, true)),
    hallOfFame: hof[0] ? { inductedYear: hof[0].inductedYear } : null,
    goaliePlayoffs,
  };
}

// Coach names on the franchise lists sometimes carry a suffix ("Jr.");
// match on the plain name.
const plain = (name: string) => name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z ]/gi, "").trim().toLowerCase();

/** Captains, head coaches (with Cups and Hall of Fame status), GMs and retired numbers. */
export async function franchisePeopleFor(db: Database, franchiseId: number): Promise<FranchisePeople> {
  const rows = await db
    .select()
    .from(franchisePeople)
    .where(eq(franchisePeople.franchiseId, franchiseId))
    .orderBy(asc(franchisePeople.role), asc(franchisePeople.position));
  const coachNames = [...new Set(rows.filter((r) => r.role === "coach").map((r) => r.name))];
  const coachRows = coachNames.length
    ? await db.select().from(coaches).where(inArray(sql`lower(${coaches.name})`, coachNames.map((n) => n.toLowerCase())))
    : [];
  const byName = new Map(coachRows.map((c) => [plain(c.name), c]));
  const pick = (role: string) => rows.filter((r) => r.role === role);
  return {
    captains: pick("captain").map((r) => ({ name: r.name, tenure: r.tenure })),
    coaches: pick("coach").map((r) => {
      const c = byName.get(plain(r.name));
      return { name: r.name, tenure: r.tenure, stanleyCups: c?.stanleyCups ?? null, inHallOfFame: c?.inHallOfFame ?? false };
    }),
    generalManagers: pick("gm").map((r) => ({ name: r.name, tenure: r.tenure })),
    retiredNumbers: pick("retired").map((r) => ({ number: r.sweaterNumber, name: r.name, tenure: r.tenure })),
  };
}

export async function getOfficials({ db }: ApiContext): Promise<OfficialsResponse> {
  const rows = await db
    .select()
    .from(officials)
    .where(eq(officials.isActive, true))
    .orderBy(asc(officials.officialType), asc(officials.sweaterNumber), asc(officials.name));
  // Game IDs start with the season's start year.
  const firstSeason = (gameId: string | null) => (gameId ? Number(gameId.slice(0, 4)) : null);
  return {
    officials: rows.map((o) => ({
      id: o.id,
      name: o.name,
      type: o.officialType,
      sweaterNumber: o.sweaterNumber,
      firstSeason: firstSeason(o.firstRegularGameId),
      firstPlayoffSeason: firstSeason(o.firstPlayoffGameId),
      countryCode: o.countryCode,
    })),
  };
}

export async function getAttendance({ db }: ApiContext): Promise<AttendanceResponse> {
  const rows = await db.select().from(leagueAttendance).orderBy(asc(leagueAttendance.season));
  return { seasons: rows.map((r) => ({ season: r.season, regular: r.regular, playoffs: r.playoffs, total: r.total })) };
}

export async function draftLottery(db: Database, year: number): Promise<DraftLottery | null> {
  const [row] = await db.select().from(draftLotteries).where(eq(draftLotteries.draftYear, year)).limit(1);
  if (!row || (!row.format && !row.oddsImageUrl && !row.results)) return null;
  return { format: row.format, oddsImageUrl: row.oddsImageUrl, notes: row.notes, results: row.results };
}

export async function hallOfFamers(db: Database, playerIds: number[]): Promise<Set<number>> {
  if (playerIds.length === 0) return new Set();
  const rows = await db.select({ id: hallOfFame.playerId }).from(hallOfFame).where(and(inArray(hallOfFame.playerId, playerIds)));
  return new Set(rows.map((r) => r.id));
}
