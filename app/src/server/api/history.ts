// Draft classes, franchise history and all-time head-to-head records, from the
// NHL records tables (refreshed weekly by /api/cron/history).

import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import { draftPicks, franchiseHeadToHead, franchiseSeasons, franchises, hallOfFame, playerCareers, players } from "@/server/db/schema";
import type { ApiContext } from "@/server/api/handler";
import { HttpError } from "@/server/api/errors";
import { round } from "@/server/api/format";
import { franchiseAwards } from "@/server/api/trophies";
import { draftLottery, franchisePeopleFor } from "@/server/api/records";
import type {
  AllTimeRecord,
  DraftPick,
  DraftResponse,
  FranchiseHistoryResponse,
  FranchiseSeason,
  NhlCareer,
} from "@/types";

const teamNotFound = () => new HttpError(404, { error: "Team not found", code: "TEAM_NOT_FOUND" });

// Today's franchise for a current team code.
async function activeFranchise(db: Database, abbrev: string) {
  const [row] = await db
    .select()
    .from(franchises)
    .where(and(eq(franchises.teamAbbreviation, abbrev.toUpperCase()), isNull(franchises.lastSeason)))
    .limit(1);
  return row ?? null;
}

const pickColumns = {
  draftYear: draftPicks.draftYear,
  round: draftPicks.round,
  pickInRound: draftPicks.pickInRound,
  overallPick: draftPicks.overallPick,
  team: draftPicks.teamAbbreviation,
  franchiseTeam: franchises.teamAbbreviation,
  playerId: draftPicks.playerId,
  hasPlayerPage: sql<boolean>`${players.id} is not null`,
  inHallOfFame: sql<boolean>`${hallOfFame.playerId} is not null`,
  name: draftPicks.playerName,
  position: draftPicks.position,
  amateurClub: draftPicks.amateurClub,
  amateurLeague: draftPicks.amateurLeague,
  countryCode: draftPicks.countryCode,
  careerGames: playerCareers.gamesPlayed,
  careerGoals: playerCareers.goals,
  careerAssists: playerCareers.assists,
  careerPoints: playerCareers.points,
  careerWins: playerCareers.wins,
  careerFirst: playerCareers.firstSeason,
  careerLast: playerCareers.lastSeason,
  careerActive: playerCareers.isActive,
};

function selectPicks(db: Database) {
  return db
    .select(pickColumns)
    .from(draftPicks)
    .leftJoin(franchises, eq(franchises.id, draftPicks.franchiseId))
    .leftJoin(playerCareers, eq(playerCareers.playerId, draftPicks.playerId))
    .leftJoin(players, eq(players.id, draftPicks.playerId))
    .leftJoin(hallOfFame, eq(hallOfFame.playerId, draftPicks.playerId));
}

type PickRow = Awaited<ReturnType<typeof selectPicks>>[number];

export function toDraftPick(r: PickRow): DraftPick {
  const career: NhlCareer | null =
    r.careerGames != null && r.careerGames > 0
      ? {
          gamesPlayed: r.careerGames,
          goals: r.careerGoals ?? null,
          assists: r.careerAssists ?? null,
          points: r.careerPoints ?? null,
          wins: r.careerWins ?? null,
          firstSeason: r.careerFirst ?? null,
          lastSeason: r.careerLast ?? null,
          active: r.careerActive === true,
        }
      : null;
  return {
    draftYear: r.draftYear,
    round: r.round,
    pickInRound: r.pickInRound,
    overallPick: r.overallPick,
    team: r.team,
    franchiseTeam: r.franchiseTeam ?? null,
    playerId: r.playerId ?? null,
    hasPlayerPage: r.hasPlayerPage === true,
    name: r.name,
    position: r.position ?? null,
    amateurClub: r.amateurClub ?? null,
    amateurLeague: r.amateurLeague ?? null,
    countryCode: r.countryCode ?? null,
    career,
    inHallOfFame: r.inHallOfFame === true,
  };
}

export async function getDraft({ db, query }: ApiContext): Promise<DraftResponse> {
  const yearRows = await db.selectDistinct({ year: draftPicks.draftYear }).from(draftPicks).orderBy(desc(draftPicks.draftYear));
  const years = yearRows.map((r) => r.year);
  if (years.length === 0) return { year: 0, years, team: null, summary: { picks: 0, playedOne: 0, played200: 0 }, picks: [], lottery: null };

  const year = query.int("year") ?? years[0];
  if (!years.includes(year)) throw new HttpError(404, { error: `No draft data for ${year}`, code: "NOT_FOUND" });

  const teamParam = query.string("team")?.toUpperCase();
  const franchise = teamParam ? await activeFranchise(db, teamParam) : null;
  if (teamParam && !franchise) throw teamNotFound();

  const rows = await selectPicks(db)
    .where(and(eq(draftPicks.draftYear, year), franchise ? eq(draftPicks.franchiseId, franchise.id) : undefined))
    .orderBy(asc(draftPicks.overallPick));
  const picks = rows.map(toDraftPick);
  return {
    year,
    years,
    team: franchise?.teamAbbreviation ?? null,
    summary: {
      picks: picks.length,
      playedOne: picks.filter((p) => (p.career?.gamesPlayed ?? 0) >= 1).length,
      played200: picks.filter((p) => (p.career?.gamesPlayed ?? 0) >= 200).length,
    },
    picks,
    lottery: await draftLottery(db, year),
  };
}

// How many recent drafts the history tab lists first-round picks for.
const FIRST_ROUND_YEARS = 15;

export async function getFranchiseHistory({ db, params }: ApiContext): Promise<FranchiseHistoryResponse> {
  const franchise = await activeFranchise(db, params.abbrev ?? "");
  if (!franchise) throw teamNotFound();

  const seasonRows = await db
    .select()
    .from(franchiseSeasons)
    .where(eq(franchiseSeasons.franchiseId, franchise.id))
    .orderBy(asc(franchiseSeasons.season));

  const seasons: FranchiseSeason[] = seasonRows.map((s) => ({
    season: s.season,
    team: s.teamAbbreviation,
    teamName: s.teamName,
    gamesPlayed: s.gamesPlayed,
    wins: s.wins,
    losses: s.losses,
    ties: s.ties,
    overtimeLosses: s.overtimeLosses,
    points: s.points,
    // Points over points available (two a game in every era).
    pointsPct: s.gamesPlayed > 0 ? round(s.points / (2 * s.gamesPlayed), 3) : null,
    goalsFor: s.goalsFor,
    goalsAgainst: s.goalsAgainst,
    divisionName: s.divisionName,
    divisionRank: s.divisionRank,
    leagueRank: s.leagueRank,
    madePlayoffs: s.madePlayoffs,
    playoffResult: s.playoffResult,
    wonCup: s.wonCup,
  }));

  const recentYears = await db
    .selectDistinct({ year: draftPicks.draftYear })
    .from(draftPicks)
    .where(eq(draftPicks.franchiseId, franchise.id))
    .orderBy(desc(draftPicks.draftYear))
    .limit(FIRST_ROUND_YEARS);
  const firstRound =
    recentYears.length === 0
      ? []
      : await selectPicks(db)
          .where(
            and(
              eq(draftPicks.franchiseId, franchise.id),
              eq(draftPicks.round, 1),
              inArray(draftPicks.draftYear, recentYears.map((r) => r.year)),
            ),
          )
          .orderBy(desc(draftPicks.draftYear), asc(draftPicks.overallPick));

  return {
    team: franchise.teamAbbreviation ?? params.abbrev!.toUpperCase(),
    franchiseName: franchise.fullName,
    firstSeason: franchise.firstSeason,
    seasons,
    playoffAppearances: seasons.filter((s) => s.madePlayoffs).length,
    cups: seasons.filter((s) => s.wonCup).length,
    firstRoundPicks: firstRound.map(toDraftPick),
    awards: await franchiseAwards(db, franchise.id),
    people: await franchisePeopleFor(db, franchise.id),
  };
}

// All-time regular-season and playoff records of `team` against `opponent`
// (current team codes), from `team`'s side. Nulls when either is unknown or
// they've never met.
export async function allTimeRecord(
  db: Database,
  team: string,
  opponent: string,
): Promise<{ regular: AllTimeRecord | null; playoffs: AllTimeRecord | null }> {
  const empty = { regular: null, playoffs: null };
  const [a, b] = await Promise.all([activeFranchise(db, team), activeFranchise(db, opponent)]);
  if (!a || !b) return empty;
  const rows = await db
    .select()
    .from(franchiseHeadToHead)
    .where(and(eq(franchiseHeadToHead.franchiseId, a.id), eq(franchiseHeadToHead.opponentFranchiseId, b.id)));
  const pick = (playoffs: boolean): AllTimeRecord | null => {
    const r = rows.find((x) => x.isPlayoffs === playoffs);
    return r && r.gamesPlayed > 0
      ? {
          gamesPlayed: r.gamesPlayed,
          wins: r.wins,
          losses: r.losses,
          ties: r.ties,
          overtimeLosses: r.overtimeLosses,
          goalsFor: r.goalsFor,
          goalsAgainst: r.goalsAgainst,
        }
      : null;
  };
  return { regular: pick(false), playoffs: pick(true) };
}

// A player's most recent entry draft selection, if any.
export async function playerDraft(db: Database, playerId: number) {
  const [row] = await db
    .select({
      year: draftPicks.draftYear,
      round: draftPicks.round,
      overallPick: draftPicks.overallPick,
      team: draftPicks.teamAbbreviation,
    })
    .from(draftPicks)
    .where(eq(draftPicks.playerId, playerId))
    .orderBy(desc(draftPicks.draftYear))
    .limit(1);
  return row ?? null;
}
