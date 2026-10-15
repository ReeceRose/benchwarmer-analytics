// NHL trophies and their winners (NHL records, refreshed weekly by
// /api/cron/history), plus this season's leaders in the stat closest to a
// trophy where there's an honest one.

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import { queryRows } from "@/server/db/client";
import { awardWinners, franchiseSeasons, players, trophies } from "@/server/db/schema";
import type { ApiContext } from "@/server/api/handler";
import { HttpError } from "@/server/api/errors";
import { round } from "@/server/api/format";
import { QueryParams } from "@/server/api/query";
import { getRookies } from "@/server/api/stats";
import { currentSeason } from "@/server/ingestion/normalize";
import type {
  AwardEntry,
  FranchiseAward,
  PlayerAward,
  TrophiesResponse,
  TrophyCategory,
  TrophyRace,
  TrophyRaceLeader,
  TrophyResponse,
  TrophySeason,
  TrophySummary,
} from "@/types";

const CATEGORIES: Record<number, TrophyCategory> = { 1: "team", 2: "player", 3: "coach", 4: "gm", 5: "other" };

type TrophyRow = typeof trophies.$inferSelect;

const entryColumns = {
  trophyId: awardWinners.trophyId,
  season: awardWinners.season,
  status: awardWinners.status,
  name: awardWinners.fullName,
  playerId: awardWinners.playerId,
  hasPlayerPage: sql<boolean>`${players.id} is not null`,
  team: franchiseSeasons.teamAbbreviation,
  isRookie: awardWinners.isRookie,
};

// Award rows with the team code that season and whether we have the player.
function selectEntries(db: Database) {
  return db
    .select(entryColumns)
    .from(awardWinners)
    .leftJoin(players, eq(players.id, awardWinners.playerId))
    .leftJoin(franchiseSeasons, and(eq(franchiseSeasons.teamId, awardWinners.teamId), eq(franchiseSeasons.season, awardWinners.season)));
}

type EntryRow = Awaited<ReturnType<typeof selectEntries>>[number];

const toEntry = (r: EntryRow): AwardEntry => ({
  season: r.season,
  status: r.status,
  name: r.name,
  playerId: r.playerId,
  hasPlayerPage: r.hasPlayerPage === true,
  team: r.team ?? null,
  isRookie: r.isRookie,
});

function toSummary(t: TrophyRow, latestWinners: AwardEntry[]): TrophySummary {
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    category: CATEGORIES[t.categoryId] ?? "other",
    description: t.description,
    imageUrl: t.imageUrl,
    latestWinners,
  };
}

const isWinner = (status: string) => status === "WINNER";

export async function getTrophies({ db }: ApiContext): Promise<TrophiesResponse> {
  const rows = await db.select().from(trophies).orderBy(trophies.categoryId, trophies.id);
  // Each trophy's most recent winners (two when shared).
  const latest = await selectEntries(db).where(
    sql`${awardWinners.status} = 'WINNER' and (${awardWinners.trophyId}, ${awardWinners.season}) in (
      select trophy_id, max(season) from award_winners where status = 'WINNER' group by trophy_id)`,
  );
  return {
    trophies: rows.map((t) => toSummary(t, latest.filter((r) => r.trophyId === t.id).map(toEntry))),
  };
}

// Winners first in each season, then runners-up, then finalists.
const STATUS_ORDER: Record<string, number> = { WINNER: 0, RUNNER_UP: 1, FINALIST: 2 };

export function groupSeasons(entries: AwardEntry[]): TrophySeason[] {
  const bySeason = new Map<number, AwardEntry[]>();
  for (const e of entries) bySeason.set(e.season, [...(bySeason.get(e.season) ?? []), e]);
  return [...bySeason.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([season, list]) => {
      const sorted = [...list].sort((a, b) => (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3) || a.name.localeCompare(b.name));
      return { season, winners: sorted.filter((e) => isWinner(e.status)), others: sorted.filter((e) => !isWinner(e.status)) };
    })
    .filter((s) => s.winners.length > 0 || s.others.length > 0);
}

export async function getTrophy(ctx: ApiContext): Promise<TrophyResponse> {
  const [trophy] = await ctx.db.select().from(trophies).where(eq(trophies.slug, ctx.params.slug ?? "")).limit(1);
  if (!trophy) throw new HttpError(404, { error: "Trophy not found", code: "NOT_FOUND" });
  const entries = (await selectEntries(ctx.db).where(eq(awardWinners.trophyId, trophy.id)).orderBy(desc(awardWinners.season))).map(toEntry);
  const seasons = groupSeasons(entries);
  return {
    trophy: toSummary(trophy, seasons.find((s) => s.winners.length > 0)?.winners ?? []),
    seasons,
    race: await trophyRace(ctx, trophy.slug),
  };
}

// --- This season's race ---

interface RaceRow {
  player_id: number;
  name: string;
  team: string | null;
  value: number | string;
}

const LIMIT = 5;

// Regular season, all situations, summed over teams (traded players count once).
function skaterRace(db: Database, season: number, value: string, defenceOnly = false) {
  return queryRows<RaceRow>(db, sql`
    select ss.player_id, p.name, (array_agg(ss.team order by ss.games_played desc))[1] as team, ${sql.raw(value)} as value
    from skater_seasons ss
    join players p on p.id = ss.player_id
    left join skater_season_advanced adv
      on adv.player_id = ss.player_id and adv.season = ss.season and adv.team = ss.team
      and adv.situation = ss.situation and adv.is_playoffs = ss.is_playoffs
    where ss.season = ${season} and ss.situation = 'all' and ss.is_playoffs = false
      ${defenceOnly ? sql`and p.position = 'D'` : sql``}
    group by ss.player_id, p.name
    having ${sql.raw(value)} is not null
    order by value desc, p.name
    limit ${LIMIT}
  `);
}

function goalieRace(db: Database, season: number) {
  return queryRows<RaceRow>(db, sql`
    select gs.player_id, p.name, (array_agg(gs.team order by gs.games_played desc))[1] as team,
      sum(gs.goals_saved_above_expected) as value
    from goalie_seasons gs
    join players p on p.id = gs.player_id
    where gs.season = ${season} and gs.situation = 'all' and gs.is_playoffs = false
    group by gs.player_id, p.name
    having sum(gs.goals_saved_above_expected) is not null
    order by value desc, p.name
    limit ${LIMIT}
  `);
}

const signed = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)}`;

function leaders(rows: RaceRow[], display: (v: number) => string): TrophyRaceLeader[] {
  return rows.map((r) => {
    const value = Number(r.value);
    return { playerId: Number(r.player_id), name: r.name, team: r.team, value: round(value, 2), display: display(value) };
  });
}

const POINTS = "sum(ss.goals + ss.assists)";
const GOALS = "sum(ss.goals)";
const GAME_SCORE = "sum(adv.game_score)";

// Only trophies with a stat that honestly tracks them. Voted awards say so.
export async function trophyRace(ctx: ApiContext, slug: string): Promise<TrophyRace | null> {
  const season = currentSeason();
  const db = ctx.db;
  const make = (stat: string, note: string, list: TrophyRaceLeader[]): TrophyRace | null =>
    list.length > 0 ? { season, stat, note, leaders: list } : null;

  switch (slug) {
    case "art-ross":
      return make("Points", "Awarded to the regular season's points leader, so this is the race.", leaders(await skaterRace(db, season, POINTS), String));
    case "maurice-richard":
      return make("Goals", "Awarded to the regular season's top goal scorer, so this is the race.", leaders(await skaterRace(db, season, GOALS), String));
    case "hart-memorial":
    case "ted-lindsay":
      return make(
        "Game Score",
        "Voted on, so this is only the skaters with the most total Game Score so far. Goalies win it too, and aren't on this scale.",
        leaders(await skaterRace(db, season, GAME_SCORE), (v) => v.toFixed(1)),
      );
    case "james-norris":
      return make(
        "Game Score, defence",
        "Voted on, so this is only the defencemen with the most total Game Score so far.",
        leaders(await skaterRace(db, season, GAME_SCORE, true), (v) => v.toFixed(1)),
      );
    case "vezina":
      return make(
        "Goals saved above expected",
        "Voted on by general managers, so this is only the goalies saving the most goals against MoneyPuck's expected goals.",
        leaders(await goalieRace(db, season), signed),
      );
    case "calder-memorial": {
      const params = new QueryParams(new URLSearchParams({ season: String(season), minGames: "1", limit: String(LIMIT) }));
      const { rookies } = await getRookies({ ...ctx, query: params });
      return make(
        "Points, rookies",
        "Voted on, so this is only the rookies with the most points so far (NHL rookie rules).",
        rookies.map((r) => ({ playerId: r.playerId, name: r.name, team: r.team, value: r.points, display: String(r.points) })),
      );
    }
    default:
      return null;
  }
}

// --- Player and franchise helpers ---

/** A player's trophies, most wins first (then most recent). */
export async function playerAwards(db: Database, playerId: number): Promise<PlayerAward[]> {
  const rows = await db
    .select({ trophy: trophies.name, slug: trophies.slug, season: awardWinners.season, status: awardWinners.status })
    .from(awardWinners)
    .innerJoin(trophies, eq(trophies.id, awardWinners.trophyId))
    .where(eq(awardWinners.playerId, playerId));
  return summarisePlayerAwards(rows);
}

export function summarisePlayerAwards(rows: { trophy: string; slug: string; season: number; status: string }[]): PlayerAward[] {
  const byTrophy = new Map<string, PlayerAward>();
  for (const r of rows) {
    const a = byTrophy.get(r.slug) ?? { trophy: r.trophy, slug: r.slug, wins: [], finalist: [] };
    (isWinner(r.status) ? a.wins : a.finalist).push(r.season);
    byTrophy.set(r.slug, a);
  }
  const latest = (a: PlayerAward) => Math.max(...a.wins, ...a.finalist);
  return [...byTrophy.values()]
    .map((a) => ({ ...a, wins: a.wins.sort((x, y) => y - x), finalist: a.finalist.sort((x, y) => y - x) }))
    .sort((a, b) => b.wins.length - a.wins.length || latest(b) - latest(a) || a.trophy.localeCompare(b.trophy));
}

/** Player and coach award winners while with a franchise, newest first. */
export async function franchiseAwards(db: Database, franchiseId: number): Promise<FranchiseAward[]> {
  const playerAndCoach = await db.select({ id: trophies.id }).from(trophies).where(inArray(trophies.categoryId, [2, 3]));
  if (playerAndCoach.length === 0) return [];
  const rows = await db
    .select({ ...entryColumns, trophy: trophies.name, slug: trophies.slug })
    .from(awardWinners)
    .innerJoin(trophies, eq(trophies.id, awardWinners.trophyId))
    .leftJoin(players, eq(players.id, awardWinners.playerId))
    .leftJoin(franchiseSeasons, and(eq(franchiseSeasons.teamId, awardWinners.teamId), eq(franchiseSeasons.season, awardWinners.season)))
    .where(
      and(
        eq(awardWinners.franchiseId, franchiseId),
        eq(awardWinners.status, "WINNER"),
        inArray(awardWinners.trophyId, playerAndCoach.map((t) => t.id)),
      ),
    )
    .orderBy(desc(awardWinners.season), trophies.id);
  return rows.map((r) => ({ ...toEntry(r), trophy: r.trophy, slug: r.slug }));
}
