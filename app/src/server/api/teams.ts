import { and, asc, desc, eq, inArray, isNotNull, isNull, gte, or, sql, type SQL } from "drizzle-orm";
import { queryRows, type Database } from "@/server/db/client";
import {
  chemistryPairs,
  gameScoreStateTimes,
  games,
  goalieSeasons,
  lineCombinations,
  players,
  skaterSeasons,
  teamGames,
  teamSeasons,
  teams,
} from "@/server/db/schema";
import type { ApiContext } from "@/server/api/handler";
import { ApiError, badRequest, notFound } from "@/server/api/errors";
import { groupBy, headshotUrl, round, seasonLabel, sum, todayUtc } from "@/server/api/format";
import { currentSeason } from "@/server/ingestion/normalize";
import { GameState, isFinalState, VALID_SITUATIONS } from "@/server/api/constants";
import { alias } from "drizzle-orm/pg-core";

type TeamRow = typeof teams.$inferSelect;
type TeamSeasonRow = typeof teamSeasons.$inferSelect;

export function toTeamDto(t: TeamRow) {
  return {
    id: t.id,
    abbreviation: t.abbreviation,
    name: t.name,
    division: t.division,
    conference: t.conference,
    isActive: t.isActive,
  };
}

export async function findTeam(db: Database, abbrev: string): Promise<TeamRow | undefined> {
  const [team] = await db.select().from(teams).where(eq(teams.abbreviation, abbrev)).limit(1);
  return team;
}

export async function requireTeam(db: Database, abbrev: string): Promise<TeamRow> {
  return (await findTeam(db, abbrev)) ?? notFound(ApiError.teamNotFound);
}

export async function getSeasons({ db }: ApiContext) {
  const rows = await db
    .selectDistinct({ season: skaterSeasons.season })
    .from(skaterSeasons)
    .orderBy(desc(skaterSeasons.season));
  return { seasons: rows.map((r) => ({ year: r.season, label: seasonLabel(r.season) })) };
}

export async function getTeams({ db }: ApiContext) {
  const rows = await db
    .select()
    .from(teams)
    .orderBy(sql`case when ${teams.isActive} then 0 else 1 end`, asc(teams.name));
  return { teams: rows.map(toTeamDto) };
}

export async function getTeam({ db, params }: ApiContext) {
  return toTeamDto(await requireTeam(db, params.abbrev));
}

const playerColumns = {
  id: players.id,
  name: players.name,
  firstName: players.firstName,
  lastName: players.lastName,
  position: players.position,
  currentTeamAbbreviation: players.currentTeamAbbreviation,
  headshotUrl: players.headshotUrl,
  birthDate: players.birthDate,
  heightInches: players.heightInches,
  weightLbs: players.weightLbs,
  shoots: players.shoots,
};

type RosterPlayer = { [K in keyof typeof playerColumns]: (typeof players.$inferSelect)[K] };

function rosterPlayerBase(p: RosterPlayer) {
  return {
    id: p.id,
    name: p.name,
    firstName: p.firstName,
    lastName: p.lastName,
    position: p.position,
    currentTeamAbbreviation: p.currentTeamAbbreviation,
    headshotUrl: headshotUrl(p.id, p.headshotUrl, p.currentTeamAbbreviation),
    birthDate: p.birthDate,
    heightInches: p.heightInches,
    weightLbs: p.weightLbs,
    shoots: p.shoots,
  };
}

const NO_STATS = {
  gamesPlayed: null,
  iceTimeSeconds: null,
  goals: null,
  assists: null,
  points: null,
  shots: null,
  expectedGoals: null,
  corsiForPct: null,
  goalsAgainst: null,
  shotsAgainst: null,
  savePercentage: null,
  goalsAgainstAverage: null,
  goalsSavedAboveExpected: null,
};

export async function getRoster({ db, params, query }: ApiContext) {
  const abbrev = params.abbrev;
  const season = query.int("season");
  const playoffs = query.bool("playoffs");
  await requireTeam(db, abbrev);

  if (season === undefined) {
    const rows = await db
      .select(playerColumns)
      .from(players)
      .where(eq(players.currentTeamAbbreviation, abbrev))
      .orderBy(asc(players.position), asc(players.name));
    return {
      teamAbbreviation: abbrev,
      players: rows.map((p) => ({ ...rosterPlayerBase(p), ...NO_STATS })),
      season: null,
      playoffs: playoffs ?? null,
    };
  }

  const [skaters, goalies] = await Promise.all([
    getSkaterSeasonsForTeam(db, abbrev, season, "all", playoffs),
    getGoalieSeasonsForTeam(db, abbrev, season, "all", playoffs),
  ]);

  const dtos = [];
  if (playoffs === undefined) {
    // Regular season + playoffs combined per player.
    for (const rows of groupBy(skaters, (r) => r.s.playerId).values()) {
      const totalToi = sum(rows, (r) => r.s.iceTimeSeconds);
      const goals = sum(rows, (r) => r.s.goals);
      const assists = sum(rows, (r) => r.s.assists);
      dtos.push({
        ...rosterPlayerBase(rows[0].p),
        ...NO_STATS,
        gamesPlayed: sum(rows, (r) => r.s.gamesPlayed),
        iceTimeSeconds: totalToi,
        goals,
        assists,
        points: goals + assists,
        shots: sum(rows, (r) => r.s.shots),
        expectedGoals: sum(rows, (r) => r.s.expectedGoals),
        corsiForPct: totalToi > 0 ? sum(rows, (r) => (r.s.corsiForPct ?? 0) * r.s.iceTimeSeconds) / totalToi : null,
      });
    }
    for (const rows of groupBy(goalies, (r) => r.g.playerId).values()) {
      const totalToi = sum(rows, (r) => r.g.iceTimeSeconds);
      const shotsAgainst = sum(rows, (r) => r.g.shotsAgainst);
      const goalsAgainst = sum(rows, (r) => r.g.goalsAgainst);
      dtos.push({
        ...rosterPlayerBase(rows[0].p),
        ...NO_STATS,
        gamesPlayed: sum(rows, (r) => r.g.gamesPlayed),
        iceTimeSeconds: totalToi,
        goalsAgainst,
        shotsAgainst,
        savePercentage: shotsAgainst > 0 ? (shotsAgainst - goalsAgainst) / shotsAgainst : null,
        goalsAgainstAverage: totalToi > 0 ? goalsAgainst / (totalToi / 3600) : null,
        goalsSavedAboveExpected: sum(rows, (r) => r.g.goalsSavedAboveExpected),
      });
    }
  } else {
    for (const { s, p } of skaters) {
      dtos.push({
        ...rosterPlayerBase(p),
        ...NO_STATS,
        gamesPlayed: s.gamesPlayed,
        iceTimeSeconds: s.iceTimeSeconds,
        goals: s.goals,
        assists: s.assists,
        points: s.goals + s.assists,
        shots: s.shots,
        expectedGoals: s.expectedGoals,
        corsiForPct: s.corsiForPct,
      });
    }
    for (const { g, p } of goalies) {
      dtos.push({
        ...rosterPlayerBase(p),
        ...NO_STATS,
        gamesPlayed: g.gamesPlayed,
        iceTimeSeconds: g.iceTimeSeconds,
        goalsAgainst: g.goalsAgainst,
        shotsAgainst: g.shotsAgainst,
        savePercentage: g.savePercentage,
        goalsAgainstAverage: g.goalsAgainstAverage,
        goalsSavedAboveExpected: g.goalsSavedAboveExpected,
      });
    }
  }
  dtos.sort((a, b) => (b.iceTimeSeconds ?? 0) - (a.iceTimeSeconds ?? 0));

  return { teamAbbreviation: abbrev, players: dtos, season, playoffs: playoffs ?? null };
}

// A team's skater season rows (with player info), most ice time first.
export function getSkaterSeasonsForTeam(
  db: Database,
  team: string,
  season: number,
  situation: string,
  playoffs: boolean | undefined,
) {
  return db
    .select({ s: skaterSeasons, p: playerColumns })
    .from(skaterSeasons)
    .innerJoin(players, eq(players.id, skaterSeasons.playerId))
    .where(
      and(
        eq(skaterSeasons.team, team),
        eq(skaterSeasons.season, season),
        eq(skaterSeasons.situation, situation),
        playoffs === undefined ? undefined : eq(skaterSeasons.isPlayoffs, playoffs),
      ),
    )
    .orderBy(desc(skaterSeasons.iceTimeSeconds), asc(skaterSeasons.id));
}

// A team's goalie season rows (with player info), most ice time first.
export function getGoalieSeasonsForTeam(
  db: Database,
  team: string,
  season: number,
  situation: string,
  playoffs: boolean | undefined,
) {
  return db
    .select({ g: goalieSeasons, p: playerColumns })
    .from(goalieSeasons)
    .innerJoin(players, eq(players.id, goalieSeasons.playerId))
    .where(
      and(
        eq(goalieSeasons.team, team),
        eq(goalieSeasons.season, season),
        eq(goalieSeasons.situation, situation),
        playoffs === undefined ? undefined : eq(goalieSeasons.isPlayoffs, playoffs),
      ),
    )
    .orderBy(desc(goalieSeasons.iceTimeSeconds), asc(goalieSeasons.id));
}

const VALID_LINE_TYPES = ["forward", "defense"] as const;
const VALID_LINE_SORT_FIELDS = [
  "toi", "icetime", "gp", "gamesplayed", "gf", "goalsfor", "ga", "goalsagainst",
  "xgf", "xgoalsfor", "xgpct", "xgoalspct", "cf", "corsifor", "cfpct", "corsipct",
] as const;

const LINE_SORT_COLUMNS = {
  toi: lineCombinations.iceTimeSeconds,
  icetime: lineCombinations.iceTimeSeconds,
  gp: lineCombinations.gamesPlayed,
  gamesplayed: lineCombinations.gamesPlayed,
  gf: lineCombinations.goalsFor,
  goalsfor: lineCombinations.goalsFor,
  ga: lineCombinations.goalsAgainst,
  goalsagainst: lineCombinations.goalsAgainst,
  xgf: lineCombinations.expectedGoalsFor,
  xgoalsfor: lineCombinations.expectedGoalsFor,
  xgpct: lineCombinations.expectedGoalsPct,
  xgoalspct: lineCombinations.expectedGoalsPct,
  cf: lineCombinations.corsiFor,
  corsifor: lineCombinations.corsiFor,
  cfpct: lineCombinations.corsiPct,
  corsipct: lineCombinations.corsiPct,
};

// Validates sortDir; returns whether to sort descending (the default).
export function parseSortDir(sortDir: string | undefined): boolean {
  if (sortDir === undefined) return true;
  const dir = sortDir.toLowerCase();
  if (dir !== "asc" && dir !== "desc") badRequest(ApiError.invalidSortDir);
  return dir === "desc";
}

// Optional page/pageSize: both or neither, page >= 1, pageSize 1-100.
export function parsePagination(page: number | undefined, pageSize: number | undefined) {
  if ((page === undefined) !== (pageSize === undefined)) badRequest(ApiError.invalidPagination);
  if (page !== undefined && page < 1) badRequest(ApiError.invalidPage);
  if (pageSize !== undefined && (pageSize < 1 || pageSize > 100)) badRequest(ApiError.invalidPageSize);
  return page !== undefined && pageSize !== undefined ? { page, pageSize } : undefined;
}

export async function getLines({ db, params, query }: ApiContext) {
  const abbrev = params.abbrev;
  const season = query.requiredInt("season");
  const situation = query.string("situation");
  const lineType = query.string("lineType");
  const minToi = query.int("minToi");
  const sortBy = query.string("sortBy");
  const page = query.int("page");
  const pageSize = query.int("pageSize");

  if (situation !== undefined && !VALID_SITUATIONS.includes(situation.toLowerCase())) {
    badRequest(ApiError.invalidSituation(VALID_SITUATIONS));
  }
  if (lineType !== undefined && !(VALID_LINE_TYPES as readonly string[]).includes(lineType.toLowerCase())) {
    badRequest(ApiError.invalidLineType(VALID_LINE_TYPES));
  }
  if (sortBy !== undefined && !(VALID_LINE_SORT_FIELDS as readonly string[]).includes(sortBy.toLowerCase())) {
    badRequest(ApiError.invalidSortField(VALID_LINE_SORT_FIELDS));
  }
  const descending = parseSortDir(query.string("sortDir"));
  const paging = parsePagination(page, pageSize);

  await requireTeam(db, abbrev);

  const minToiSeconds = (minToi ?? 0) * 60;
  const filters: (SQL | undefined)[] = [eq(lineCombinations.team, abbrev), eq(lineCombinations.season, season)];
  // Situation is matched exactly (case-sensitive).
  if (situation) filters.push(eq(lineCombinations.situation, situation));
  if (lineType?.toLowerCase() === "forward") filters.push(isNotNull(lineCombinations.player3Id));
  if (lineType?.toLowerCase() === "defense") filters.push(isNull(lineCombinations.player3Id));
  if (minToiSeconds > 0) filters.push(gte(lineCombinations.iceTimeSeconds, minToiSeconds));
  const where = and(...filters);

  const sortColumn = LINE_SORT_COLUMNS[(sortBy?.toLowerCase() ?? "toi") as keyof typeof LINE_SORT_COLUMNS];
  const p1 = alias(players, "p1");
  const p2 = alias(players, "p2");
  const p3 = alias(players, "p3");

  const linesQuery = db
    .select({
      l: lineCombinations,
      p1: { name: p1.name, position: p1.position },
      p2: { name: p2.name, position: p2.position },
      p3: { name: p3.name, position: p3.position },
    })
    .from(lineCombinations)
    .leftJoin(p1, eq(p1.id, lineCombinations.player1Id))
    .leftJoin(p2, eq(p2.id, lineCombinations.player2Id))
    .leftJoin(p3, eq(p3.id, lineCombinations.player3Id))
    .where(where)
    // Postgres puts NULLs first for DESC.
    .orderBy(descending ? desc(sortColumn) : asc(sortColumn), asc(lineCombinations.id))
    .$dynamic();
  if (paging) linesQuery.limit(paging.pageSize).offset((paging.page - 1) * paging.pageSize);

  const [[{ count }], rows] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(lineCombinations).where(where),
    linesQuery,
  ]);

  const lines = rows.map(({ l, p1, p2, p3 }) => ({
    id: l.id,
    season: l.season,
    team: l.team,
    situation: l.situation,
    player1: { id: l.player1Id, name: p1?.name ?? "Unknown", position: p1?.position ?? null },
    player2: { id: l.player2Id, name: p2?.name ?? "Unknown", position: p2?.position ?? null },
    player3: l.player3Id === null ? null : { id: l.player3Id, name: p3?.name ?? "Unknown", position: p3?.position ?? null },
    iceTimeSeconds: l.iceTimeSeconds,
    gamesPlayed: l.gamesPlayed,
    goalsFor: l.goalsFor,
    goalsAgainst: l.goalsAgainst,
    expectedGoalsPct: l.expectedGoalsPct,
    corsiPct: l.corsiPct,
  }));

  return {
    lines,
    totalCount: count,
    page: paging?.page ?? null,
    pageSize: paging?.pageSize ?? null,
    totalPages: paging ? Math.ceil(count / paging.pageSize) : null,
  };
}

// Share of for+against as a percentage, 1 dp.
export function pairPercentage(forValue: number, againstValue: number): number | null {
  const total = forValue + againstValue;
  return total > 0 ? round((forValue / total) * 100, 1) : null;
}

const FORWARD_POSITIONS = ["C", "LW", "RW"];

export async function getChemistryMatrix({ db, params, query }: ApiContext) {
  const abbrev = params.abbrev;
  const season = query.requiredInt("season");
  const situation = query.string("situation");
  const position = query.string("position")?.toLowerCase();
  await requireTeam(db, abbrev);

  const filters: (SQL | undefined)[] = [eq(chemistryPairs.team, abbrev), eq(chemistryPairs.season, season)];
  if (situation) filters.push(eq(chemistryPairs.situation, situation));
  if (position === "forward" || position === "forwards") {
    filters.push(inArray(chemistryPairs.player1Position, FORWARD_POSITIONS));
    filters.push(inArray(chemistryPairs.player2Position, FORWARD_POSITIONS));
  } else if (position === "defense" || position === "defensemen") {
    filters.push(eq(chemistryPairs.player1Position, "D"), eq(chemistryPairs.player2Position, "D"));
  }

  const rows = await db
    .select()
    .from(chemistryPairs)
    .where(and(...filters))
    .orderBy(desc(chemistryPairs.totalIceTimeSeconds), asc(chemistryPairs.player1Id), asc(chemistryPairs.player2Id));

  return {
    team: abbrev,
    season,
    situation: situation ?? null,
    pairs: rows.map((c) => ({
      player1Id: c.player1Id,
      player1Name: c.player1Name,
      player1Position: c.player1Position,
      player2Id: c.player2Id,
      player2Name: c.player2Name,
      player2Position: c.player2Position,
      totalIceTimeSeconds: c.totalIceTimeSeconds,
      gamesPlayed: c.gamesPlayed,
      goalsFor: c.goalsFor,
      goalsAgainst: c.goalsAgainst,
      expectedGoalsPct: pairPercentage(c.xGoalsFor, c.xGoalsAgainst),
      corsiPct: pairPercentage(c.corsiFor, c.corsiAgainst),
    })),
  };
}

export async function getTeamSeasons({ db, params }: ApiContext) {
  const abbrev = params.abbrev;
  await requireTeam(db, abbrev);
  const rows = await db
    .selectDistinct({ season: skaterSeasons.season })
    .from(skaterSeasons)
    .where(eq(skaterSeasons.team, abbrev))
    .orderBy(desc(skaterSeasons.season));
  return { seasons: rows.map((r) => ({ year: r.season, label: seasonLabel(r.season) })) };
}

// Opportunities are estimated as one per 2 minutes of PP/PK time.
function opportunities(stats: TeamSeasonRow): number {
  return Math.trunc(stats.iceTime / 120);
}

export function ppPercentage(stats: TeamSeasonRow | undefined): number {
  if (!stats) return 0;
  const opps = opportunities(stats);
  return opps > 0 ? (stats.goalsFor / opps) * 100 : 0;
}

export function pkPercentage(stats: TeamSeasonRow | undefined): number {
  if (!stats) return 0;
  const opps = opportunities(stats);
  return opps > 0 ? (1 - stats.goalsAgainst / opps) * 100 : 0;
}

export function powerPlaySummary(stats: TeamSeasonRow | undefined, rank: number | null) {
  if (!stats) {
    return {
      opportunities: 0, goals: 0, percentage: 0, xGoals: 0, xGoalsPer60: 0, shotsFor: 0,
      shootingPct: 0, highDangerChances: 0, highDangerGoals: 0, leagueRank: null, iceTimeSeconds: 0,
    };
  }
  const iceTimeSeconds = Math.trunc(stats.iceTime);
  const iceTimeMinutes = iceTimeSeconds / 60;
  const shootingPct = stats.shotsOnGoalFor > 0 ? (stats.goalsFor / stats.shotsOnGoalFor) * 100 : 0;
  const xgPer60 = iceTimeMinutes > 0 ? (stats.xGoalsFor / iceTimeMinutes) * 60 : 0;
  return {
    opportunities: opportunities(stats),
    goals: stats.goalsFor,
    percentage: round(ppPercentage(stats), 1),
    xGoals: round(stats.xGoalsFor, 1),
    xGoalsPer60: round(xgPer60, 2),
    shotsFor: stats.shotsOnGoalFor,
    shootingPct: round(shootingPct, 1),
    highDangerChances: stats.highDangerShotsFor,
    highDangerGoals: stats.highDangerGoalsFor,
    leagueRank: rank,
    iceTimeSeconds,
  };
}

export function penaltyKillSummary(stats: TeamSeasonRow | undefined, rank: number | null) {
  if (!stats) {
    return {
      timesShorthanded: 0, goalsAgainst: 0, percentage: 0, xGoalsAgainst: 0, xGoalsAgainstPer60: 0, shotsAgainst: 0,
      savePct: 0, highDangerAgainst: 0, highDangerGoalsAgainst: 0, leagueRank: null, iceTimeSeconds: 0,
    };
  }
  const iceTimeSeconds = Math.trunc(stats.iceTime);
  const iceTimeMinutes = iceTimeSeconds / 60;
  const savePct =
    stats.shotsOnGoalAgainst > 0 ? (stats.shotsOnGoalAgainst - stats.goalsAgainst) / stats.shotsOnGoalAgainst : 0;
  const xgaPer60 = iceTimeMinutes > 0 ? (stats.xGoalsAgainst / iceTimeMinutes) * 60 : 0;
  return {
    timesShorthanded: opportunities(stats),
    goalsAgainst: stats.goalsAgainst,
    percentage: round(pkPercentage(stats), 1),
    xGoalsAgainst: round(stats.xGoalsAgainst, 1),
    xGoalsAgainstPer60: round(xgaPer60, 2),
    shotsAgainst: stats.shotsOnGoalAgainst,
    // A 0-1 fraction rounded to 1 dp (see API_NOTES.md).
    savePct: round(savePct, 1),
    highDangerAgainst: stats.highDangerShotsAgainst,
    highDangerGoalsAgainst: stats.highDangerGoalsAgainst,
    leagueRank: rank,
    iceTimeSeconds,
  };
}

// Penalties drawn and taken (all situations) per 60, ranked in the league.
// MoneyPuck's penaltiesAgainst = penalties the opponent took (drawn).
export function penaltySummary(allTeams: readonly TeamSeasonRow[], abbrev: string) {
  const rates = allTeams
    .filter((t) => t.iceTime > 0)
    .map((t) => {
      const per60 = (n: number) => (n / t.iceTime) * 3600;
      return {
        team: t.teamAbbreviation,
        row: t,
        drawnPer60: per60(t.penaltiesAgainst),
        takenPer60: per60(t.penaltiesFor),
        netPer60: per60(t.penaltiesAgainst - t.penaltiesFor),
      };
    });
  const own = rates.find((r) => r.team === abbrev);
  if (!own) return null;
  const key = (r: (typeof rates)[number]) => r.team;
  const average = (value: (r: (typeof rates)[number]) => number) =>
    round(rates.reduce((total, r) => total + value(r), 0) / rates.length, 2);
  const { row } = own;
  return {
    drawn: row.penaltiesAgainst,
    taken: row.penaltiesFor,
    net: row.penaltiesAgainst - row.penaltiesFor,
    drawnPer60: round(own.drawnPer60, 2),
    takenPer60: round(own.takenPer60, 2),
    netPer60: round(own.netPer60, 2),
    pimDrawn: row.penaltyMinutesAgainst,
    pimTaken: row.penaltyMinutesFor,
    // 1 = draws the most, takes the fewest, best differential.
    drawnRank: rankBy(rates, (r) => r.drawnPer60, key).get(abbrev) ?? 0,
    takenRank: rankBy(rates, (r) => -r.takenPer60, key).get(abbrev) ?? 0,
    netRank: rankBy(rates, (r) => r.netPer60, key).get(abbrev) ?? 0,
    leagueDrawnPer60: average((r) => r.drawnPer60),
    leagueTakenPer60: average((r) => r.takenPer60),
  };
}

// Every team's season row, ordered by xG% (NULLs first, as Postgres sorts
// DESC), which is the tiebreak for the stable re-sorts below.
export function getTeamSeasonsForSeason(db: Database, season: number, situation: string, playoffs: boolean) {
  return db
    .select()
    .from(teamSeasons)
    .where(and(eq(teamSeasons.season, season), eq(teamSeasons.situation, situation), eq(teamSeasons.isPlayoffs, playoffs)))
    .orderBy(desc(teamSeasons.xGoalsPercentage), asc(teamSeasons.id));
}

// 1-based ranks by a value, highest first; ties keep input order.
export function rankBy<T>(items: readonly T[], value: (item: T) => number, key: (item: T) => string): Map<string, number> {
  const sorted = [...items].sort((a, b) => value(b) - value(a));
  return new Map(sorted.map((item, i) => [key(item), i + 1]));
}

export async function getSpecialTeams({ db, params, query }: ApiContext) {
  const abbrev = params.abbrev;
  const season = query.int("season") ?? currentSeason();
  const playoffs = query.bool("playoffs") ?? false;
  await requireTeam(db, abbrev);

  const [allPp, allPk, allSituations] = await Promise.all([
    getTeamSeasonsForSeason(db, season, "5on4", playoffs),
    getTeamSeasonsForSeason(db, season, "4on5", playoffs),
    getTeamSeasonsForSeason(db, season, "all", playoffs),
  ]);
  const ppStats = allPp.find((t) => t.teamAbbreviation === abbrev);
  const pkStats = allPk.find((t) => t.teamAbbreviation === abbrev);
  const ppRanks = rankBy(allPp, ppPercentage, (t) => t.teamAbbreviation);
  const pkRanks = rankBy(allPk, pkPercentage, (t) => t.teamAbbreviation);

  return {
    teamAbbreviation: abbrev,
    season,
    // A team with no row for the situation gets rank 0.
    powerPlay: powerPlaySummary(ppStats, ppRanks.get(abbrev) ?? 0),
    penaltyKill: penaltyKillSummary(pkStats, pkRanks.get(abbrev) ?? 0),
    penalties: penaltySummary(allSituations, abbrev),
  };
}

const SPECIAL_TEAMS_SITUATIONS = ["5on4", "4on5"];

export async function getSpecialTeamsPlayers({ db, params, query }: ApiContext) {
  const abbrev = params.abbrev;
  await requireTeam(db, abbrev);
  const situation = query.string("situation")?.toLowerCase() ?? "5on4";
  if (!SPECIAL_TEAMS_SITUATIONS.includes(situation)) badRequest(ApiError.invalidSituation(SPECIAL_TEAMS_SITUATIONS));
  const season = query.int("season") ?? currentSeason();
  const playoffs = query.bool("playoffs") ?? false;

  const rows = await getSkaterSeasonsForTeam(db, abbrev, season, situation, playoffs);
  const playersDto = rows
    .filter(({ s }) => s.iceTimeSeconds > 0)
    .map(({ s, p }) => {
      const minutes = s.iceTimeSeconds / 60;
      const points = s.goals + s.assists;
      return {
        playerId: s.playerId,
        name: p.name,
        position: p.position,
        iceTimeSeconds: s.iceTimeSeconds,
        goals: s.goals,
        assists: s.assists,
        points,
        shots: s.shots,
        xGoals: s.expectedGoals,
        xGoalsPer60: s.expectedGoalsPer60,
        pointsPer60: minutes > 0 ? (points / minutes) * 60 : null,
        gamesPlayed: s.gamesPlayed,
      };
    });

  return { teamAbbreviation: abbrev, season, situation, players: playersDto };
}

// Completed games: final, or in the past with a score (stale state).
export function completedGame() {
  return or(
    eq(games.gameState, GameState.final),
    and(sql`${games.gameDate} < ${todayUtc()}`, or(sql`${games.homeScore} > 0`, sql`${games.awayScore} > 0`)),
  );
}

export async function getSpecialTeamsTrend({ db, params, query }: ApiContext) {
  const abbrev = params.abbrev;
  await requireTeam(db, abbrev);
  const season = query.int("season") ?? currentSeason();
  const playoffs = query.bool("playoffs") ?? false;

  const teamGames = await db
    .select({
      gameId: games.gameId,
      gameDate: games.gameDate,
      homeTeamCode: games.homeTeamCode,
      awayTeamCode: games.awayTeamCode,
    })
    .from(games)
    .where(
      and(
        eq(games.season, season),
        eq(games.gameType, playoffs ? GameState.playoffs : GameState.regularSeason),
        or(eq(games.homeTeamCode, abbrev), eq(games.awayTeamCode, abbrev)),
        completedGame(),
      ),
    )
    .orderBy(asc(games.gameDate), asc(games.id));
  if (teamGames.length === 0) return { teamAbbreviation: abbrev, season, games: [] };

  // Per-game PP shots (team at 5v4) and PK shots against (team at 4v5),
  // aggregated in SQL instead of loading every shot.
  const perGame = await queryRows<{
    game_id: string;
    pp_shots: number;
    pp_goals: number;
    pp_xg: string | null;
    pk_shots: number;
    pk_goals: number;
    pk_xg: string | null;
  }>(db, sql`
    with g as (
      select game_id, home_team_code = ${abbrev} as is_home
      from games
      where game_id in (${sql.join(teamGames.map((game) => sql`${game.gameId}`), sql`, `)})
    ), s as (
      select s.game_id, s.is_goal, coalesce(s.x_goal, 0) as x_goal,
        s.team_code = ${abbrev}
          and case when g.is_home then s.home_skaters_on_ice = 5 and s.away_skaters_on_ice = 4
                   else s.away_skaters_on_ice = 5 and s.home_skaters_on_ice = 4 end as is_pp,
        s.team_code <> ${abbrev}
          and (s.home_team_code = ${abbrev} or s.away_team_code = ${abbrev})
          and case when g.is_home then s.home_skaters_on_ice = 4 and s.away_skaters_on_ice = 5
                   else s.away_skaters_on_ice = 4 and s.home_skaters_on_ice = 5 end as is_pk
      from shots s join g on g.game_id = s.game_id
    )
    select game_id,
      count(*) filter (where is_pp)::int as pp_shots,
      count(*) filter (where is_pp and is_goal)::int as pp_goals,
      sum(x_goal) filter (where is_pp) as pp_xg,
      count(*) filter (where is_pk)::int as pk_shots,
      count(*) filter (where is_pk and is_goal)::int as pk_goals,
      sum(x_goal) filter (where is_pk) as pk_xg
    from s group by game_id
  `);
  const byGame = new Map(perGame.map((r) => [r.game_id, r]));

  let cumPpGoals = 0;
  let cumPpXg = 0;
  let cumPkGoals = 0;
  let cumPkXg = 0;
  const gameDtos = teamGames.map((game) => {
    const isHome = game.homeTeamCode === abbrev;
    const opponent = isHome ? game.awayTeamCode : game.homeTeamCode;
    const stats = byGame.get(game.gameId);
    if (!stats) {
      // No shot data for this game: zero entry, cumulative values unrounded.
      return {
        gameId: game.gameId, gameDate: game.gameDate, opponent, isHome,
        ppGoals: 0, ppXGoals: 0, ppShots: 0, pkGoalsAgainst: 0, pkXGoalsAgainst: 0, pkShotsAgainst: 0,
        cumulativePpGoals: cumPpGoals, cumulativePpXGoals: cumPpXg,
        cumulativePkGoalsAgainst: cumPkGoals, cumulativePkXGoalsAgainst: cumPkXg,
      };
    }
    const ppXg = Number(stats.pp_xg ?? 0);
    const pkXg = Number(stats.pk_xg ?? 0);
    cumPpGoals += stats.pp_goals;
    cumPpXg += ppXg;
    cumPkGoals += stats.pk_goals;
    cumPkXg += pkXg;
    return {
      gameId: game.gameId,
      gameDate: game.gameDate,
      opponent,
      isHome,
      ppGoals: stats.pp_goals,
      ppXGoals: round(ppXg, 2),
      ppShots: stats.pp_shots,
      pkGoalsAgainst: stats.pk_goals,
      pkXGoalsAgainst: round(pkXg, 2),
      pkShotsAgainst: stats.pk_shots,
      cumulativePpGoals: cumPpGoals,
      cumulativePpXGoals: round(cumPpXg, 2),
      cumulativePkGoalsAgainst: cumPkGoals,
      cumulativePkXGoalsAgainst: round(cumPkXg, 2),
    };
  });

  return { teamAbbreviation: abbrev, season, games: gameDtos };
}

interface ShotAggregation {
  isFor: boolean;
  state: string;
  shotCount: number;
  goalCount: number;
  xGoals: number;
}

export function scoreStateBreakdown(
  state: string | null,
  aggregations: readonly ShotAggregation[],
  timeSeconds: number | null,
) {
  const relevant = state === null ? aggregations : aggregations.filter((a) => a.state === state);
  const forAgg = relevant.filter((a) => a.isFor);
  const againstAgg = relevant.filter((a) => !a.isFor);
  const sf = sum(forAgg, (a) => a.shotCount);
  const sa = sum(againstAgg, (a) => a.shotCount);
  const gf = sum(forAgg, (a) => a.goalCount);
  const ga = sum(againstAgg, (a) => a.goalCount);
  const xgf = sum(forAgg, (a) => a.xGoals);
  const xga = sum(againstAgg, (a) => a.xGoals);
  return {
    state: state ?? "total",
    shotsFor: sf,
    shotsAgainst: sa,
    goalsFor: gf,
    goalsAgainst: ga,
    xGoalsFor: round(xgf, 2),
    xGoalsAgainst: round(xga, 2),
    shootingPct: sf > 0 ? round((gf / sf) * 100, 1) : null,
    savePct: sa > 0 ? round(((sa - ga) / sa) * 100, 1) : null,
    xgDifferential: round(xgf - xga, 2),
    timeSeconds,
  };
}

export async function getScoreStateStats({ db, params, query }: ApiContext) {
  const abbrev = params.abbrev;
  if (!abbrev.trim() || abbrev.length > 3) badRequest("Invalid team abbreviation");
  await requireTeam(db, abbrev);
  const season = query.int("season") ?? currentSeason();
  const playoffs = query.bool("playoffs") ?? false;

  const [shotRows, [time]] = await Promise.all([
    // Score state from the team's perspective; at most 6 rows.
    queryRows<{ is_for: boolean; state: string; shot_count: number; goal_count: number; x_goals: string }>(db, sql`
      select is_for, state, count(*)::int as shot_count, count(*) filter (where is_goal)::int as goal_count,
        coalesce(sum(coalesce(x_goal, 0)), 0) as x_goals
      from (
        select team_code = ${abbrev} as is_for, is_goal, x_goal,
          case
            when home_team_goals = away_team_goals then 'tied'
            when team_code = ${abbrev} then
              case when is_home_team then (case when home_team_goals > away_team_goals then 'leading' else 'trailing' end)
                   else (case when away_team_goals > home_team_goals then 'leading' else 'trailing' end) end
            when home_team_code = ${abbrev} then (case when home_team_goals > away_team_goals then 'leading' else 'trailing' end)
            else (case when away_team_goals > home_team_goals then 'leading' else 'trailing' end)
          end as state
        from shots
        where season = ${season} and is_playoff_game = ${playoffs}
          and (team_code = ${abbrev} or home_team_code = ${abbrev} or away_team_code = ${abbrev})
      ) s
      group by is_for, state
    `),
    db
      .select({
        count: sql<number>`count(*)::int`,
        leading: sql<number>`coalesce(sum(${gameScoreStateTimes.leadingSeconds}), 0)::int`,
        trailing: sql<number>`coalesce(sum(${gameScoreStateTimes.trailingSeconds}), 0)::int`,
        tied: sql<number>`coalesce(sum(${gameScoreStateTimes.tiedSeconds}), 0)::int`,
      })
      .from(gameScoreStateTimes)
      .where(
        and(
          eq(gameScoreStateTimes.teamAbbreviation, abbrev),
          eq(gameScoreStateTimes.season, season),
          eq(gameScoreStateTimes.isPlayoffs, playoffs),
        ),
      ),
  ]);

  const aggregations: ShotAggregation[] = shotRows.map((r) => ({
    isFor: r.is_for,
    state: r.state,
    shotCount: r.shot_count,
    goalCount: r.goal_count,
    xGoals: Number(r.x_goals),
  }));
  // No score-state rows → null times.
  const hasTime = time.count > 0;
  const totalTime = time.leading + time.trailing + time.tied;

  return {
    teamAbbreviation: abbrev,
    season,
    isPlayoffs: playoffs,
    leading: scoreStateBreakdown("leading", aggregations, hasTime ? time.leading : null),
    trailing: scoreStateBreakdown("trailing", aggregations, hasTime ? time.trailing : null),
    tied: scoreStateBreakdown("tied", aggregations, hasTime ? time.tied : null),
    total: scoreStateBreakdown(null, aggregations, totalTime > 0 ? totalTime : null),
  };
}

// One situation of a team's game: MoneyPuck counts (goals exclude shootouts).
export interface TeamGameSplit {
  goalsFor: number;
  goalsAgainst: number;
  xGoalsFor: number;
  xGoalsAgainst: number;
  shotAttemptsFor: number;
  shotAttemptsAgainst: number;
}

type TeamGameLogRow = {
  gameId: string;
  gameDate: string;
  opponent: string;
  isHome: boolean;
  situation: string;
  homeScore: number | null;
  awayScore: number | null;
  periodType: string | null;
  gameState: string | null;
} & TeamGameSplit;

function toSplit(r: TeamGameSplit): TeamGameSplit {
  return {
    goalsFor: r.goalsFor,
    goalsAgainst: r.goalsAgainst,
    xGoalsFor: round(r.xGoalsFor, 2),
    xGoalsAgainst: round(r.xGoalsAgainst, 2),
    shotAttemptsFor: r.shotAttemptsFor,
    shotAttemptsAgainst: r.shotAttemptsAgainst,
  };
}

// "W", "L" or "OTL" from the final score (shootouts included); null until final.
export function gameResult(teamScore: number, opponentScore: number, periodType: string | null): "W" | "L" | "OTL" {
  if (teamScore > opponentScore) return "W";
  return periodType === "OT" || periodType === "SO" ? "OTL" : "L";
}

// Rows ordered by date, two per game ("all" and "5on5") → one entry per game.
export function buildTeamGameLog(rows: readonly TeamGameLogRow[]) {
  const games = new Map<string, TeamGameLogRow[]>();
  for (const row of rows) {
    const list = games.get(row.gameId);
    if (list) list.push(row);
    else games.set(row.gameId, [row]);
  }
  return [...games.values()].flatMap((parts) => {
    const all = parts.find((p) => p.situation === "all");
    if (!all) return [];
    const fiveOnFive = parts.find((p) => p.situation === "5on5");
    const final = isFinalState(all.gameState) && all.homeScore !== null && all.awayScore !== null;
    const teamScore = final ? (all.isHome ? all.homeScore! : all.awayScore!) : null;
    const opponentScore = final ? (all.isHome ? all.awayScore! : all.homeScore!) : null;
    return [{
      gameId: all.gameId,
      gameDate: all.gameDate,
      opponent: all.opponent,
      isHome: all.isHome,
      teamScore,
      opponentScore,
      periodType: final ? all.periodType : null,
      result: teamScore !== null && opponentScore !== null ? gameResult(teamScore, opponentScore, all.periodType) : null,
      all: toSplit(all),
      fiveOnFive: fiveOnFive ? toSplit(fiveOnFive) : null,
    }];
  });
}

export async function getTeamGameLog({ db, params, query }: ApiContext) {
  const abbrev = params.abbrev;
  if (!abbrev.trim() || abbrev.length > 3) badRequest("Invalid team abbreviation");
  await requireTeam(db, abbrev);
  const season = query.int("season") ?? currentSeason();
  const playoffs = query.bool("playoffs") ?? false;

  const rows = await db
    .select({
      gameId: teamGames.gameId,
      gameDate: teamGames.gameDate,
      opponent: teamGames.opponentAbbreviation,
      isHome: teamGames.isHome,
      situation: teamGames.situation,
      goalsFor: teamGames.goalsFor,
      goalsAgainst: teamGames.goalsAgainst,
      xGoalsFor: teamGames.xGoalsFor,
      xGoalsAgainst: teamGames.xGoalsAgainst,
      shotAttemptsFor: teamGames.shotAttemptsFor,
      shotAttemptsAgainst: teamGames.shotAttemptsAgainst,
      homeScore: games.homeScore,
      awayScore: games.awayScore,
      periodType: games.periodType,
      gameState: games.gameState,
    })
    .from(teamGames)
    .leftJoin(games, eq(games.gameId, teamGames.gameId))
    .where(
      and(
        eq(teamGames.teamAbbreviation, abbrev),
        eq(teamGames.season, season),
        eq(teamGames.isPlayoffs, playoffs),
        inArray(teamGames.situation, ["all", "5on5"]),
      ),
    )
    .orderBy(asc(teamGames.gameDate), asc(teamGames.gameId));

  return { teamAbbreviation: abbrev, season, isPlayoffs: playoffs, games: buildTeamGameLog(rows) };
}
