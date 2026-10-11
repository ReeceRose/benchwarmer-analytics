import Decimal from "decimal.js";
import { and, asc, desc, eq } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import { teamSeasons, teams } from "@/server/db/schema";
import type { ApiContext } from "@/server/api/handler";
import { round } from "@/server/api/format";
import { getStandings, type NhlTeamStandings } from "@/server/api/nhl-client";
import { pkPercentage, ppPercentage } from "@/server/api/teams";

type TeamSeasonRow = typeof teamSeasons.$inferSelect;
type TeamInfo = { name: string; division: string | null; conference: string | null };

// Latest season with team stats (0 when there is none, as the C# did).
export async function latestTeamSeason(db: Database): Promise<number> {
  const [row] = await db
    .select({ season: teamSeasons.season })
    .from(teamSeasons)
    .orderBy(desc(teamSeasons.season))
    .limit(1);
  return row?.season ?? 0;
}

// TeamSeasonRepository.GetBySeasonAsync with the Team included.
export async function teamSeasonsWithTeam(db: Database, season: number, situation: string, playoffs = false) {
  const rows = await db
    .select({ ts: teamSeasons, team: { name: teams.name, division: teams.division, conference: teams.conference } })
    .from(teamSeasons)
    .leftJoin(teams, eq(teams.abbreviation, teamSeasons.teamAbbreviation))
    .where(and(eq(teamSeasons.season, season), eq(teamSeasons.situation, situation), eq(teamSeasons.isPlayoffs, playoffs)))
    .orderBy(desc(teamSeasons.xGoalsPercentage), asc(teamSeasons.id));
  return rows as { ts: TeamSeasonRow; team: TeamInfo | null }[];
}

// C# Math.Round(double) to an int (banker's rounding).
function roundInt(value: number): number {
  return round(value, 0);
}

// Pythagorean win expectation (exponent 2); 0.5 when both sides are 0.
export function pythagorean(forValue: number, againstValue: number): number {
  return forValue > 0 || againstValue > 0
    ? (forValue * forValue) / (forValue * forValue + againstValue * againstValue)
    : 0.5;
}

// Estimated record from actual goals: wins by Pythagorean expectation, ~10%
// of losses as OT losses.
export function estimatedRecord(gamesPlayed: number, goalsFor: number, goalsAgainst: number) {
  const wins = roundInt(pythagorean(goalsFor, goalsAgainst) * gamesPlayed);
  const losses = gamesPlayed - wins;
  const otLosses = roundInt(losses * 0.1);
  return { wins, regLosses: losses - otLosses, otLosses, points: wins * 2 + otLosses };
}

// PDO = shooting % + save % (shots floored at 1 to avoid dividing by zero).
export function pdoParts(ts: Pick<TeamSeasonRow, "shotsOnGoalFor" | "shotsOnGoalAgainst" | "goalsFor" | "goalsAgainst">) {
  const shotsFor = ts.shotsOnGoalFor > 0 ? ts.shotsOnGoalFor : 1;
  const shotsAgainst = ts.shotsOnGoalAgainst > 0 ? ts.shotsOnGoalAgainst : 1;
  const shootingPct = (ts.goalsFor / shotsFor) * 100;
  const savePct = ((shotsAgainst - ts.goalsAgainst) / shotsAgainst) * 100;
  return { shootingPct, savePct, pdo: shootingPct + savePct };
}

// Points expected from xG: Pythagorean on xGF/xGA over 2 points per game.
export function expectedPoints(gamesPlayed: number, xGoalsFor: number, xGoalsAgainst: number): number {
  return gamesPlayed > 0 ? roundInt(pythagorean(xGoalsFor, xGoalsAgainst) * gamesPlayed * 2) : 0;
}

export function buildPowerRanking(ts: TeamSeasonRow, team: TeamInfo | null, ppPct: number, pkPct: number) {
  const record = estimatedRecord(ts.gamesPlayed, ts.goalsFor, ts.goalsAgainst);
  const { shootingPct, savePct, pdo } = pdoParts(ts);
  const expected = expectedPoints(ts.gamesPlayed, ts.xGoalsFor, ts.xGoalsAgainst);
  return {
    abbreviation: ts.teamAbbreviation,
    name: team?.name ?? ts.teamAbbreviation,
    division: team?.division ?? null,
    conference: team?.conference ?? null,
    gamesPlayed: ts.gamesPlayed,
    wins: record.wins,
    losses: record.regLosses,
    otLosses: record.otLosses,
    points: record.points,
    goalsFor: ts.goalsFor,
    goalsAgainst: ts.goalsAgainst,
    xGoalsFor: ts.xGoalsFor,
    xGoalsAgainst: ts.xGoalsAgainst,
    xGoalsPct: ts.xGoalsPercentage,
    corsiPct: ts.corsiPercentage,
    fenwickPct: ts.fenwickPercentage,
    pdo,
    shootingPct,
    savePct,
    ppPct,
    pkPct,
    expectedPoints: expected,
    pointsDiff: record.points - expected,
    pointsRank: 0,
    xGoalsPctRank: 0,
  };
}

export type PowerRanking = ReturnType<typeof buildPowerRanking>;

// "1st", "2nd", "11th", ...
export function ordinal(n: number): string {
  if (n <= 0) return String(n);
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
}

function regressionCandidate(r: PowerRanking) {
  // C# "F1" formatting rounds half away from zero.
  const pdo = new Decimal(r.pdo).toFixed(1, Decimal.ROUND_HALF_UP);
  return {
    abbreviation: r.abbreviation,
    name: r.name,
    pointsRank: r.pointsRank,
    xGoalsPctRank: r.xGoalsPctRank,
    pdo: r.pdo,
    reason: `${ordinal(r.xGoalsPctRank)} in xG%, ${ordinal(r.pointsRank)} in points (PDO: ${pdo})`,
  };
}

// Teams 8+ spots better by xG% than by points with PDO < 99 (unlucky).
export function likelyToImprove(rankings: readonly PowerRanking[], max = 4) {
  return rankings
    .filter((r) => r.pointsRank - r.xGoalsPctRank >= 8 && r.pdo < 99)
    .sort((a, b) => b.pointsRank - b.xGoalsPctRank - (a.pointsRank - a.xGoalsPctRank))
    .slice(0, max)
    .map(regressionCandidate);
}

// Teams 8+ spots better by points than by xG% with PDO > 101 (lucky).
export function likelyToRegress(rankings: readonly PowerRanking[], max = 4) {
  return rankings
    .filter((r) => r.xGoalsPctRank - r.pointsRank >= 8 && r.pdo > 101)
    .sort((a, b) => b.xGoalsPctRank - b.pointsRank - (a.xGoalsPctRank - a.pointsRank))
    .slice(0, max)
    .map(regressionCandidate);
}

// Descending sort key treating null as smallest (LINQ OrderByDescending).
function descNullsLast(a: number | null, b: number | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return b - a;
}

export function rankPowerRankings(rankings: PowerRanking[]): PowerRanking[] {
  const byPoints = [...rankings].sort((a, b) => b.points - a.points || b.wins - a.wins);
  const byXg = [...rankings].sort((a, b) => descNullsLast(a.xGoalsPct, b.xGoalsPct));
  return byPoints.map((team, i) => ({
    ...team,
    pointsRank: i + 1,
    xGoalsPctRank: byXg.findIndex((r) => r.abbreviation === team.abbreviation) + 1,
  }));
}

function percentagesByTeam(rows: { ts: TeamSeasonRow }[], pct: (ts: TeamSeasonRow) => number) {
  return new Map(rows.map(({ ts }) => [ts.teamAbbreviation, pct(ts)]));
}

export async function getPowerRankings({ db, query }: ApiContext) {
  const season = query.int("season") ?? (await latestTeamSeason(db));
  if (season === 0) return { season, teams: [], insights: { likelyToImprove: [], likelyToRegress: [] } };

  const [all, pp, pk] = await Promise.all([
    teamSeasonsWithTeam(db, season, "all"),
    teamSeasonsWithTeam(db, season, "5on4"),
    teamSeasonsWithTeam(db, season, "4on5"),
  ]);
  const ppByTeam = percentagesByTeam(pp, ppPercentage);
  const pkByTeam = percentagesByTeam(pk, pkPercentage);

  const ranked = rankPowerRankings(
    all.map(({ ts, team }) =>
      buildPowerRanking(ts, team, ppByTeam.get(ts.teamAbbreviation) ?? 0, pkByTeam.get(ts.teamAbbreviation) ?? 0),
    ),
  );
  return {
    season,
    teams: ranked,
    insights: { likelyToImprove: likelyToImprove(ranked), likelyToRegress: likelyToRegress(ranked) },
  };
}

function formatRecord(wins = 0, losses = 0, otLosses = 0): string {
  return `${wins}-${losses}-${otLosses}`;
}

function formatStreak(code: string | null | undefined, count = 0): string | null {
  return !code || count === 0 ? null : `${code}${count}`;
}

export function toOfficialStandings(standings: Iterable<NhlTeamStandings>) {
  return [...standings]
    .sort(
      (a, b) =>
        (b.points ?? 0) - (a.points ?? 0) || (b.wins ?? 0) - (a.wins ?? 0) || (a.gamesPlayed ?? 0) - (b.gamesPlayed ?? 0),
    )
    .map((s, i) => ({
      abbreviation: s.teamAbbrev?.default ?? "",
      name: s.teamName?.default ?? "",
      division: s.divisionName ?? null,
      conference: s.conferenceName ?? null,
      gamesPlayed: s.gamesPlayed ?? 0,
      wins: s.wins ?? 0,
      losses: s.losses ?? 0,
      otLosses: s.otLosses ?? 0,
      points: s.points ?? 0,
      pointPctg: s.pointPctg ?? null,
      goalsFor: s.goalFor ?? 0,
      goalsAgainst: s.goalAgainst ?? 0,
      goalDifferential: s.goalDifferential ?? 0,
      homeRecord: formatRecord(s.homeWins, s.homeLosses, s.homeOtLosses),
      awayRecord: formatRecord(s.roadWins, s.roadLosses, s.roadOtLosses),
      last10Record: formatRecord(s.l10Wins, s.l10Losses, s.l10OtLosses),
      streak: formatStreak(s.streakCode, s.streakCount),
      divisionRank: s.divisionSequence ?? 0,
      conferenceRank: s.conferenceSequence ?? 0,
      leagueRank: i + 1,
      wildcardRank: s.wildcardSequence ?? 0,
    }));
}

export async function getOfficialStandings() {
  const standings = await getStandings();
  return { season: null, teams: toOfficialStandings(standings.values()) };
}

export async function getStandingsAnalytics({ db, query }: ApiContext) {
  const season = query.int("season") ?? (await latestTeamSeason(db));
  if (season === 0) return { season, teams: [] };

  const rows = await teamSeasonsWithTeam(db, season, "all");
  return {
    season,
    teams: rows.map(({ ts }) => {
      const { shootingPct, savePct, pdo } = pdoParts(ts);
      const expected = expectedPoints(ts.gamesPlayed, ts.xGoalsFor, ts.xGoalsAgainst);
      const { points } = estimatedRecord(ts.gamesPlayed, ts.goalsFor, ts.goalsAgainst);
      return {
        abbreviation: ts.teamAbbreviation,
        xGoalsFor: ts.xGoalsFor,
        xGoalsAgainst: ts.xGoalsAgainst,
        xGoalsPct: ts.xGoalsPercentage,
        corsiPct: ts.corsiPercentage,
        fenwickPct: ts.fenwickPercentage,
        pdo,
        shootingPct,
        savePct,
        expectedPoints: expected,
        pointsDiff: points - expected,
      };
    }),
  };
}

// 1-based ranks by a key; ties keep input order (stable LINQ OrderBy).
export function ranks<T extends { abbreviation: string }>(
  items: readonly T[],
  key: (item: T) => number,
  descending: boolean,
): Map<string, number> {
  const sorted = [...items].sort((a, b) => (descending ? key(b) - key(a) : key(a) - key(b)));
  return new Map(sorted.map((item, i) => [item.abbreviation, i + 1]));
}

interface CategoryInput {
  abbreviation: string;
  name: string;
  goalsFor: number;
  goalsAgainst: number;
  goalDifferential: number;
  xGoalsFor: number;
  xGoalsAgainst: number;
  xGoalsPct: number | null;
  corsiPct: number | null;
  fenwickPct: number | null;
  ppPct: number;
  pkPct: number;
  highDangerChancesFor: number;
  highDangerChancesAgainst: number;
  shootingPct: number | null;
  savePct: number | null;
  faceoffPct: number | null;
  penaltiesDrawn: number;
  penaltiesTaken: number;
  penaltyDifferential: number;
  hits: number;
  hitsAgainst: number;
  takeaways: number;
  giveaways: number;
  blockedShots: number;
  points: number | null;
}

// Category ranks plus a weighted overall score (mean rank, lower is better):
// 3x xG% and goal differential; 2x CF%, FF%, PP%, PK%, Sv%, HD for/against;
// 1x the other 14 categories.
export function categoryRankings(teamData: readonly CategoryInput[], includePoints: boolean) {
  const r = {
    goalsFor: ranks(teamData, (t) => t.goalsFor, true),
    goalsAgainst: ranks(teamData, (t) => t.goalsAgainst, false),
    goalDifferential: ranks(teamData, (t) => t.goalDifferential, true),
    xGoalsFor: ranks(teamData, (t) => t.xGoalsFor, true),
    xGoalsAgainst: ranks(teamData, (t) => t.xGoalsAgainst, false),
    xGoalsPct: ranks(teamData, (t) => t.xGoalsPct ?? 0, true),
    corsiPct: ranks(teamData, (t) => t.corsiPct ?? 0, true),
    fenwickPct: ranks(teamData, (t) => t.fenwickPct ?? 0, true),
    ppPct: ranks(teamData, (t) => t.ppPct, true),
    pkPct: ranks(teamData, (t) => t.pkPct, true),
    highDangerFor: ranks(teamData, (t) => t.highDangerChancesFor, true),
    highDangerAgainst: ranks(teamData, (t) => t.highDangerChancesAgainst, false),
    shootingPct: ranks(teamData, (t) => t.shootingPct ?? 0, true),
    savePct: ranks(teamData, (t) => t.savePct ?? 0, true),
    faceoffPct: ranks(teamData, (t) => t.faceoffPct ?? 0, true),
    penaltiesDrawn: ranks(teamData, (t) => t.penaltiesDrawn, true),
    penaltiesTaken: ranks(teamData, (t) => t.penaltiesTaken, false),
    penaltyDifferential: ranks(teamData, (t) => t.penaltyDifferential, true),
    hits: ranks(teamData, (t) => t.hits, true),
    hitsAgainst: ranks(teamData, (t) => t.hitsAgainst, false),
    takeaways: ranks(teamData, (t) => t.takeaways, true),
    giveaways: ranks(teamData, (t) => t.giveaways, false),
    blockedShots: ranks(teamData, (t) => t.blockedShots, true),
  };
  const withPoints = teamData.filter((t) => t.points !== null);
  const pointsRanks = includePoints && withPoints.length > 0 ? ranks(withPoints, (t) => t.points ?? 0, true) : null;

  const rank = (map: Map<string, number>, abbrev: string) => map.get(abbrev) ?? 0;
  const scores = new Map(
    teamData.map((t) => {
      const a = t.abbreviation;
      const high = (rank(r.xGoalsPct, a) + rank(r.goalDifferential, a)) * 3;
      const medium =
        (rank(r.corsiPct, a) + rank(r.fenwickPct, a) + rank(r.ppPct, a) + rank(r.pkPct, a) +
          rank(r.savePct, a) + rank(r.highDangerFor, a) + rank(r.highDangerAgainst, a)) * 2;
      const standard =
        rank(r.goalsFor, a) + rank(r.goalsAgainst, a) + rank(r.xGoalsFor, a) + rank(r.xGoalsAgainst, a) +
        rank(r.shootingPct, a) + rank(r.faceoffPct, a) + rank(r.penaltiesDrawn, a) + rank(r.penaltiesTaken, a) +
        rank(r.penaltyDifferential, a) + rank(r.hits, a) + rank(r.hitsAgainst, a) + rank(r.takeaways, a) +
        rank(r.giveaways, a) + rank(r.blockedShots, a);
      return [a, (high + medium + standard) / 34];
    }),
  );
  const overall = new Map(
    [...scores].sort((x, y) => x[1] - y[1]).map(([abbrev], i) => [abbrev, i + 1]),
  );

  return teamData
    .map((t) => {
      const a = t.abbreviation;
      return {
        ...t,
        pointsRank: t.points !== null ? (pointsRanks?.get(a) ?? null) : null,
        overallRank: overall.get(a) ?? 0,
        overallScore: round(scores.get(a) ?? 0, 2),
        goalsForRank: rank(r.goalsFor, a),
        goalsAgainstRank: rank(r.goalsAgainst, a),
        goalDifferentialRank: rank(r.goalDifferential, a),
        xGoalsForRank: rank(r.xGoalsFor, a),
        xGoalsAgainstRank: rank(r.xGoalsAgainst, a),
        xGoalsPctRank: rank(r.xGoalsPct, a),
        corsiPctRank: rank(r.corsiPct, a),
        fenwickPctRank: rank(r.fenwickPct, a),
        ppPctRank: rank(r.ppPct, a),
        pkPctRank: rank(r.pkPct, a),
        highDangerForRank: rank(r.highDangerFor, a),
        highDangerAgainstRank: rank(r.highDangerAgainst, a),
        shootingPctRank: rank(r.shootingPct, a),
        savePctRank: rank(r.savePct, a),
        faceoffPctRank: rank(r.faceoffPct, a),
        penaltiesDrawnRank: rank(r.penaltiesDrawn, a),
        penaltiesTakenRank: rank(r.penaltiesTaken, a),
        penaltyDifferentialRank: rank(r.penaltyDifferential, a),
        hitsRank: rank(r.hits, a),
        hitsAgainstRank: rank(r.hitsAgainst, a),
        takeawaysRank: rank(r.takeaways, a),
        giveawaysRank: rank(r.giveaways, a),
        blockedShotsRank: rank(r.blockedShots, a),
      };
    })
    .sort((x, y) => x.overallRank - y.overallRank);
}

export async function getCategoryRankings({ db, query }: ApiContext) {
  const latest = await latestTeamSeason(db);
  const season = query.int("season") ?? latest;
  const team = query.string("team");
  if (season === 0) return { season, teams: [] };

  // Actual points come from live NHL standings, so only for the current season.
  const isCurrentSeason = season === latest;
  const [standings, all, pp, pk] = await Promise.all([
    isCurrentSeason ? getStandings() : Promise.resolve(new Map<string, NhlTeamStandings>()),
    teamSeasonsWithTeam(db, season, "all"),
    teamSeasonsWithTeam(db, season, "5on4"),
    teamSeasonsWithTeam(db, season, "4on5"),
  ]);
  if (all.length === 0) return { season, teams: [] };

  const ppByTeam = percentagesByTeam(pp, ppPercentage);
  const pkByTeam = percentagesByTeam(pk, pkPercentage);
  const teamData: CategoryInput[] = all.map(({ ts, team: info }) => {
    const abbrev = ts.teamAbbreviation;
    const faceoffs = ts.faceOffsWonFor + ts.faceOffsWonAgainst;
    const standing = standings.get(abbrev);
    return {
      abbreviation: abbrev,
      name: info?.name ?? abbrev,
      goalsFor: ts.goalsFor,
      goalsAgainst: ts.goalsAgainst,
      goalDifferential: ts.goalsFor - ts.goalsAgainst,
      xGoalsFor: ts.xGoalsFor,
      xGoalsAgainst: ts.xGoalsAgainst,
      xGoalsPct: ts.xGoalsPercentage,
      corsiPct: ts.corsiPercentage,
      fenwickPct: ts.fenwickPercentage,
      ppPct: ppByTeam.get(abbrev) ?? 0,
      pkPct: pkByTeam.get(abbrev) ?? 0,
      highDangerChancesFor: ts.highDangerShotsFor,
      highDangerChancesAgainst: ts.highDangerShotsAgainst,
      shootingPct: ts.shotsOnGoalFor > 0 ? (ts.goalsFor / ts.shotsOnGoalFor) * 100 : null,
      savePct:
        ts.shotsOnGoalAgainst > 0 ? ((ts.shotsOnGoalAgainst - ts.goalsAgainst) / ts.shotsOnGoalAgainst) * 100 : null,
      faceoffPct: faceoffs > 0 ? (ts.faceOffsWonFor / faceoffs) * 100 : null,
      // MoneyPuck's penaltiesAgainst = penalties the opponent took (drawn).
      penaltiesDrawn: ts.penaltiesAgainst,
      penaltiesTaken: ts.penaltiesFor,
      penaltyDifferential: ts.penaltiesAgainst - ts.penaltiesFor,
      hits: ts.hitsFor,
      hitsAgainst: ts.hitsAgainst,
      takeaways: ts.takeawaysFor,
      giveaways: ts.giveawaysFor,
      blockedShots: ts.blockedShotAttemptsFor,
      points: standing ? (standing.points ?? 0) : null,
    };
  });

  let results = categoryRankings(teamData, isCurrentSeason);
  if (team) results = results.filter((t) => t.abbreviation.toLowerCase() === team.toLowerCase());
  return { season, teams: results };
}
