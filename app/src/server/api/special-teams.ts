import { and, asc, eq, sql } from "drizzle-orm";
import { players, skaterSeasonAdvanced, skaterSeasons, teamSeasons, teams } from "@/server/db/schema";
import type { ApiContext } from "@/server/api/handler";
import { ApiError, badRequest } from "@/server/api/errors";
import { round } from "@/server/api/format";
import { getTeamSeasonsForSeason, pkPercentage, ppPercentage, rankBy } from "@/server/api/teams";
import { currentSeason } from "@/server/ingestion/normalize";

type TeamSeasonRow = typeof teamSeasons.$inferSelect;

const SPECIAL_TEAMS_SITUATIONS = ["5on4", "4on5"];
const VALID_POSITIONS = ["F", "D"];
const PLAYER_LEADER_SORTS = ["toi", "goals", "assists", "points", "pointsper60", "xgper60"];
const PENALTY_SORTS = ["penaltiesdrawn", "penaltiestaken", "netpenalties", "drawnper60", "takenper60", "netper60"];
const FORWARDS = ["C", "LW", "RW"];

// Position filter: "D" (or any prefix of a stored position), or "F" for C/LW/RW.
export function matchesPosition(playerPosition: string | null, filter: string | undefined): boolean {
  if (filter === undefined) return true;
  const f = filter.toUpperCase();
  return (playerPosition?.startsWith(f) ?? false) || (f === "F" && FORWARDS.includes(playerPosition ?? ""));
}

function validatePosition(position: string | undefined) {
  if (position !== undefined && !VALID_POSITIONS.includes(position.toUpperCase())) {
    badRequest(`Invalid position. Valid positions: ${VALID_POSITIONS.join(", ")}`);
  }
}

// Stable sort by a numeric key, ascending or descending.
export function sortByKey<T>(items: T[], key: (item: T) => number, ascending: boolean): T[] {
  return items.sort((a, b) => (ascending ? key(a) - key(b) : key(b) - key(a)));
}

export function teamSpecialTeamsRanking(
  team: { abbreviation: string; name: string },
  pp: TeamSeasonRow | undefined,
  pk: TeamSeasonRow | undefined,
  ppRank: number,
  pkRank: number,
  overallRank: number,
) {
  const ppIceTime = pp ? Math.trunc(pp.iceTime) : 0;
  const ppMinutes = ppIceTime / 60;
  const ppOpportunities = ppIceTime > 0 && pp ? Math.trunc(pp.iceTime / 120) : 0;
  const ppGoals = pp?.goalsFor ?? 0;
  const ppPct = ppOpportunities > 0 ? (ppGoals / ppOpportunities) * 100 : 0;
  const ppXgPer60 = ppMinutes > 0 && pp ? (pp.xGoalsFor / ppMinutes) * 60 : 0;
  const ppShPct = pp && pp.shotsOnGoalFor > 0 ? (pp.goalsFor / pp.shotsOnGoalFor) * 100 : 0;

  const pkIceTime = pk ? Math.trunc(pk.iceTime) : 0;
  const pkMinutes = pkIceTime / 60;
  const pkTimesShort = pkIceTime > 0 && pk ? Math.trunc(pk.iceTime / 120) : 0;
  const pkGoalsAgainst = pk?.goalsAgainst ?? 0;
  const pkPct = pkTimesShort > 0 ? (1 - pkGoalsAgainst / pkTimesShort) * 100 : 0;
  const pkXgaPer60 = pkMinutes > 0 && pk ? (pk.xGoalsAgainst / pkMinutes) * 60 : 0;
  const pkSvPct =
    pk && pk.shotsOnGoalAgainst > 0 ? ((pk.shotsOnGoalAgainst - pk.goalsAgainst) / pk.shotsOnGoalAgainst) * 100 : 0;

  return {
    teamAbbreviation: team.abbreviation,
    teamName: team.name,
    ppPct: round(ppPct, 1),
    ppRank,
    ppGoals,
    ppOpportunities,
    ppXgPer60: round(ppXgPer60, 2),
    ppShPct: round(ppShPct, 1),
    pkPct: round(pkPct, 1),
    pkRank,
    pkGoalsAgainst,
    pkTimesShort,
    pkXgaPer60: round(pkXgaPer60, 2),
    pkSvPct: round(pkSvPct, 1),
    specialTeamsPct: round(ppPct + pkPct, 1),
    overallRank,
  };
}

export async function getTeamRankings({ db, query }: ApiContext) {
  const season = query.int("season") ?? currentSeason();
  const playoffs = query.bool("playoffs") ?? false;

  const [allTeams, ppRows, pkRows] = await Promise.all([
    db
      .select({ abbreviation: teams.abbreviation, name: teams.name })
      .from(teams)
      .where(eq(teams.isActive, true))
      .orderBy(asc(teams.name)),
    getTeamSeasonsForSeason(db, season, "5on4", playoffs),
    getTeamSeasonsForSeason(db, season, "4on5", playoffs),
  ]);
  const ppByTeam = new Map(ppRows.map((r) => [r.teamAbbreviation, r]));
  const pkByTeam = new Map(pkRows.map((r) => [r.teamAbbreviation, r]));

  const stats = allTeams.map((team) => {
    const pp = ppByTeam.get(team.abbreviation);
    const pk = pkByTeam.get(team.abbreviation);
    const ppPct = ppPercentage(pp);
    const pkPct = pkPercentage(pk);
    return { team, pp, pk, ppPct, pkPct, combined: ppPct + pkPct };
  });
  const key = (s: (typeof stats)[number]) => s.team.abbreviation;
  const ppRanks = rankBy(stats, (s) => s.ppPct, key);
  const pkRanks = rankBy(stats, (s) => s.pkPct, key);
  const overallRanks = rankBy(stats, (s) => s.combined, key);

  const rankings = sortByKey([...stats], (s) => s.combined, false).map((s) =>
    teamSpecialTeamsRanking(
      s.team,
      s.pp,
      s.pk,
      ppRanks.get(key(s)) ?? 0,
      pkRanks.get(key(s)) ?? 0,
      overallRanks.get(key(s)) ?? 0,
    ),
  );
  return { season, teams: rankings };
}

export async function getPlayerLeaders({ db, query }: ApiContext) {
  const situation = query.string("situation")?.toLowerCase();
  if (!situation || !SPECIAL_TEAMS_SITUATIONS.includes(situation)) {
    badRequest(ApiError.invalidSituation(SPECIAL_TEAMS_SITUATIONS));
  }
  const position = query.string("position");
  validatePosition(position);
  const sort = query.string("sortBy")?.toLowerCase() ?? "points";
  if (!PLAYER_LEADER_SORTS.includes(sort)) badRequest(`Invalid sortBy. Valid options: ${PLAYER_LEADER_SORTS.join(", ")}`);

  const season = query.int("season") ?? currentSeason();
  const playoffs = query.bool("playoffs") ?? false;
  const minToiSeconds = (query.int("minToi") ?? 50) * 60;
  const limit = Math.min(Math.max(query.int("limit") ?? 50, 1), 100);
  const team = query.string("team")?.toLowerCase();
  const ascending = query.string("sortDir")?.toLowerCase() === "asc";

  const rows = await db
    .select({ s: skaterSeasons, name: players.name, position: players.position })
    .from(skaterSeasons)
    .innerJoin(players, eq(players.id, skaterSeasons.playerId))
    .where(
      and(eq(skaterSeasons.season, season), eq(skaterSeasons.situation, situation), eq(skaterSeasons.isPlayoffs, playoffs)),
    )
    .orderBy(asc(skaterSeasons.id));

  const filtered = rows.filter(
    (r) =>
      r.s.iceTimeSeconds >= minToiSeconds &&
      matchesPosition(r.position, position) &&
      (team === undefined || r.s.team.toLowerCase() === team),
  );
  const points = (r: (typeof rows)[number]) => r.s.goals + r.s.assists;
  const sortKeys: Record<string, (r: (typeof rows)[number]) => number> = {
    toi: (r) => r.s.iceTimeSeconds,
    goals: (r) => r.s.goals,
    assists: (r) => r.s.assists,
    pointsper60: (r) => (r.s.iceTimeSeconds > 0 ? points(r) / (r.s.iceTimeSeconds / 3600) : 0),
    xgper60: (r) => r.s.expectedGoalsPer60 ?? 0,
    points,
  };

  const leaders = sortByKey(filtered, sortKeys[sort], ascending)
    .slice(0, limit)
    .map(({ s, name, position: pos }) => {
      const minutes = s.iceTimeSeconds / 60;
      const pts = s.goals + s.assists;
      return {
        playerId: s.playerId,
        name,
        team: s.team,
        position: pos,
        gamesPlayed: s.gamesPlayed,
        iceTimeMinutes: round(minutes, 1),
        goals: s.goals,
        assists: s.assists,
        points: pts,
        pointsPer60: round(minutes > 0 ? (pts / minutes) * 60 : 0, 2),
        xgPer60: round(s.expectedGoalsPer60 ?? 0, 2),
        goalsDiff: round(s.goals - (s.expectedGoals ?? 0), 2),
      };
    });

  return { season, situation, players: leaders };
}

export async function getPenaltyStats({ db, query }: ApiContext) {
  const position = query.string("position");
  validatePosition(position);
  const sort = query.string("sortBy")?.toLowerCase() ?? "netpenalties";
  if (!PENALTY_SORTS.includes(sort)) badRequest(`Invalid sortBy. Valid options: ${PENALTY_SORTS.join(", ")}`);

  const season = query.int("season") ?? currentSeason();
  const playoffs = query.bool("playoffs") ?? false;
  const minToiMinutes = query.int("minToi") ?? 100;
  const limit = Math.min(Math.max(query.int("limit") ?? 50, 1), 100);
  const team = query.string("team")?.toLowerCase();
  const ascending = query.string("sortDir")?.toLowerCase() === "asc";

  // Penalties come from the "all" situation advanced row, ice time and GP
  // from the matching "all" skater row.
  const adv = skaterSeasonAdvanced;
  const rows = await db
    .select({
      playerId: adv.playerId,
      name: players.name,
      team: adv.team,
      position: players.position,
      gamesPlayed: skaterSeasons.gamesPlayed,
      iceTimeSeconds: skaterSeasons.iceTimeSeconds,
      penaltiesDrawn: adv.penaltiesDrawn,
      penaltiesTaken: adv.penalties,
      pimDrawn: adv.penalityMinutesDrawn,
      pimTaken: adv.penalityMinutes,
    })
    .from(adv)
    .innerJoin(
      skaterSeasons,
      and(
        eq(skaterSeasons.playerId, adv.playerId),
        eq(skaterSeasons.season, adv.season),
        eq(skaterSeasons.team, adv.team),
        eq(skaterSeasons.isPlayoffs, adv.isPlayoffs),
      ),
    )
    .innerJoin(players, eq(players.id, adv.playerId))
    .where(
      and(
        eq(adv.season, season),
        eq(adv.isPlayoffs, playoffs),
        eq(adv.situation, "all"),
        eq(skaterSeasons.situation, "all"),
        sql`${skaterSeasons.iceTimeSeconds} > 0`,
      ),
    )
    .orderBy(asc(adv.id));

  const stats = rows
    .filter(
      (r) =>
        r.iceTimeSeconds / 60 >= minToiMinutes &&
        matchesPosition(r.position, position) &&
        (team === undefined || r.team.toLowerCase() === team),
    )
    .map((r) => {
      const minutes = r.iceTimeSeconds / 60;
      const drawn = Math.trunc(r.penaltiesDrawn ?? 0);
      const taken = Math.trunc(r.penaltiesTaken ?? 0);
      const net = drawn - taken;
      return {
        playerId: r.playerId,
        name: r.name,
        team: r.team,
        position: r.position,
        gamesPlayed: r.gamesPlayed,
        iceTimeMinutes: round(minutes, 1),
        penaltiesDrawn: drawn,
        penaltiesTaken: taken,
        netPenalties: net,
        penaltiesDrawnPer60: round(minutes > 0 ? (drawn / minutes) * 60 : 0, 2),
        penaltiesTakenPer60: round(minutes > 0 ? (taken / minutes) * 60 : 0, 2),
        netPenaltiesPer60: round(minutes > 0 ? (net / minutes) * 60 : 0, 2),
        pimDrawn: round(r.pimDrawn ?? 0, 0),
        pimTaken: round(r.pimTaken ?? 0, 0),
      };
    });

  type Row = (typeof stats)[number];
  const sortKeys: Record<string, (r: Row) => number> = {
    penaltiesdrawn: (r) => r.penaltiesDrawn,
    penaltiestaken: (r) => r.penaltiesTaken,
    drawnper60: (r) => r.penaltiesDrawnPer60,
    takenper60: (r) => r.penaltiesTakenPer60,
    netper60: (r) => r.netPenaltiesPer60,
    netpenalties: (r) => r.netPenalties,
  };

  return { season, players: sortByKey(stats, sortKeys[sort], ascending).slice(0, limit) };
}
