// Records by game situation (scoring first, leading after two, one-goal
// games, rest days) and goalie save % by days of rest, from NHL stats API
// reports. Each report covers every team, so ranks and league numbers come
// from the same request.

import type { ApiContext } from "@/server/api/handler";
import { HttpError } from "@/server/api/errors";
import { round } from "@/server/api/format";
import { getStatsReport, regularSeasonFilter } from "@/server/api/nhl-client";
import { requirePlayer } from "@/server/api/players";
import { NHL_TEAM_IDS } from "@/server/api/tracking";
import { currentSeason } from "@/server/ingestion/normalize";
import type { GoalieRestResponse, GoalieRestSplit, SituationRecord, TeamSituationsResponse } from "@/types";

type Row = Record<string, number | string | null | undefined> & { teamId?: number };

const n = (row: Row | undefined, key: string) => {
  const v = row?.[key];
  return typeof v === "number" ? v : 0;
};

interface Tally {
  wins: number;
  losses: number;
  otLosses: number;
  ties: number;
}

const points = (t: Tally) => 2 * t.wins + t.otLosses + t.ties;
const games = (t: Tally) => t.wins + t.losses + t.otLosses + t.ties;
const pointsPct = (t: Tally) => (games(t) > 0 ? round(points(t) / (2 * games(t)), 3) : null);

/**
 * One situation for one team, ranked against every team that's been in it.
 * `tally` reads the situation from a team's row.
 */
export function situationRecord(key: string, label: string, teamId: number, rows: Row[], tally: (r: Row) => Tally): SituationRecord {
  const all = rows.map((r) => ({ teamId: r.teamId, t: tally(r) }));
  const own = all.find((x) => x.teamId === teamId)?.t ?? { wins: 0, losses: 0, otLosses: 0, ties: 0 };
  const ownPct = pointsPct(own);
  const ranked = all.filter((x) => games(x.t) > 0);
  const league = ranked.reduce((acc, x) => ({ pts: acc.pts + points(x.t), gp: acc.gp + games(x.t) }), { pts: 0, gp: 0 });
  return {
    key,
    label,
    gamesPlayed: games(own),
    wins: own.wins,
    losses: own.losses,
    otLosses: own.otLosses + own.ties,
    pointsPct: ownPct,
    rank: ownPct === null ? null : 1 + ranked.filter((x) => (pointsPct(x.t) ?? 0) > ownPct).length,
    leaguePointsPct: league.gp > 0 ? round(league.pts / (2 * league.gp), 3) : null,
  };
}

// Field names in the stats reports for one situation.
const tally = (wins: string, losses: string, otLosses: string, ties?: string) => (r: Row): Tally => ({
  wins: n(r, wins),
  losses: n(r, losses),
  otLosses: n(r, otLosses),
  ties: ties ? n(r, ties) : 0,
});

const RESULT_SITUATIONS = [
  { report: "team/scoretrailfirst", key: "scoredFirst", label: "Scored first", tally: tally("winsScoringFirst", "lossesScoringFirst", "otLossesScoringFirst", "tiesScoringFirst") },
  { report: "team/scoretrailfirst", key: "trailedFirst", label: "Gave up the first goal", tally: tally("winsTrailingFirst", "lossesTrailingFirst", "otLossesTrailingFirst", "tiesTrailingFirst") },
  { report: "team/leadingtrailing", key: "leadAfter1", label: "Leading after one", tally: tally("winsLeadPeriod1", "lossLeadPeriod1", "otLossLeadPeriod1", "tiesLeadPeriod1") },
  { report: "team/leadingtrailing", key: "trailAfter1", label: "Trailing after one", tally: tally("winsTrailPeriod1", "lossTrailPeriod1", "otLossTrailPeriod1", "tiesTrailPeriod1") },
  { report: "team/leadingtrailing", key: "leadAfter2", label: "Leading after two", tally: tally("winsLeadPeriod2", "lossLeadPeriod2", "otLossLeadPeriod2", "tiesLeadPeriod2") },
  { report: "team/leadingtrailing", key: "trailAfter2", label: "Trailing after two", tally: tally("winsTrailPeriod2", "lossTrailPeriod2", "otLossTrailPeriod2", "tiesTrailPeriod2") },
  { report: "team/goalgames", key: "oneGoal", label: "One-goal games", tally: tally("winsOneGoalGames", "lossesOneGoalGames", "otLossesOneGoalGames") },
  { report: "team/outshootoutshotby", key: "outshot", label: "Outshot the opponent", tally: tally("winsOutshootOpponent", "lossesOutshootOpponent", "otLossesOutshootOpponent", "tiesOutshootOpponent") },
  { report: "team/outshootoutshotby", key: "outshotBy", label: "Outshot by the opponent", tally: tally("winsOutshotByOpponent", "lossesOutshotByOpponent", "otLossesOutshotByOpponent", "tiesOutshotByOpponent") },
];

const REST_LABELS = ["Back-to-back", "1 day of rest", "2 days of rest", "3+ days of rest"];

// daysbetweengames has a row per team per rest length; 3 and more fold together.
export function restRows(rows: Row[]): Row[] {
  const byTeam = new Map<number, Row>();
  for (const r of rows) {
    if (r.teamId == null) continue;
    const bucket = Math.min(3, n(r, "daysRest"));
    const t = byTeam.get(r.teamId) ?? { teamId: r.teamId };
    for (const f of ["wins", "losses", "otLosses", "ties"]) t[`${f}${bucket}`] = n(t, `${f}${bucket}`) + n(r, f);
    byTeam.set(r.teamId, t);
  }
  return [...byTeam.values()];
}

function upstream(): never {
  throw new HttpError(502, { error: "NHL stats are unavailable", code: "UPSTREAM_UNAVAILABLE" });
}

export async function getTeamSituations(ctx: ApiContext): Promise<TeamSituationsResponse> {
  const teamId = NHL_TEAM_IDS[ctx.params.abbrev?.toUpperCase() ?? ""];
  if (teamId === undefined) throw new HttpError(404, { error: "Team not found", code: "TEAM_NOT_FOUND" });
  const season = ctx.query.int("season") ?? currentSeason();
  const filter = regularSeasonFilter(season);

  const reports = [...new Set([...RESULT_SITUATIONS.map((s) => s.report), "team/daysbetweengames"])];
  const fetched = await Promise.all(reports.map((r) => getStatsReport<Row>(r, filter)));
  if (fetched.some((r) => r === null)) upstream();
  const byReport = new Map(reports.map((r, i) => [r, fetched[i]!]));

  const rest = restRows(byReport.get("team/daysbetweengames")!);
  return {
    season,
    results: RESULT_SITUATIONS.map((s) => situationRecord(s.key, s.label, teamId, byReport.get(s.report)!, s.tally)),
    rest: REST_LABELS.map((label, days) =>
      situationRecord(`rest${days}`, label, teamId, rest, tally(`wins${days}`, `losses${days}`, `otLosses${days}`, `ties${days}`)),
    ),
  };
}

const REST_SUFFIXES = ["0", "1", "2", "3", "4Plus"];
const GOALIE_REST_LABELS = ["Back-to-back", "1 day", "2 days", "3 days", "4+ days"];

// League save % on each rest length, weighted by games (the report has no
// shots per rest length).
export function goalieRestSplits(own: Row | undefined, all: Row[]): GoalieRestSplit[] {
  return REST_SUFFIXES.map((suffix, i) => {
    const gp = `gamesPlayedDaysRest${suffix}`;
    const sv = `savePctDaysRest${suffix}`;
    const weighted = all.filter((r) => n(r, gp) > 0 && typeof r[sv] === "number");
    const games = weighted.reduce((sum, r) => sum + n(r, gp), 0);
    return {
      daysRest: i,
      label: GOALIE_REST_LABELS[i],
      gamesPlayed: n(own, gp),
      savePct: n(own, gp) > 0 && typeof own?.[sv] === "number" ? round(own[sv] as number, 4) : null,
      leagueSavePct: games > 0 ? round(weighted.reduce((sum, r) => sum + n(r, gp) * n(r, sv), 0) / games, 4) : null,
    };
  });
}

// This season, or last season before the goalie has played.
export async function getGoalieRest(ctx: ApiContext): Promise<GoalieRestResponse> {
  const player = await requirePlayer(ctx.db, ctx.params.id);
  if (player.position !== "G") return { season: null, splits: [] };
  for (const season of [currentSeason(), currentSeason() - 1]) {
    const rows = await getStatsReport<Row & { playerId?: number }>("goalie/daysrest", regularSeasonFilter(season));
    if (rows === null) upstream();
    const own = rows.find((r) => r.playerId === player.id);
    if (own && n(own, "gamesPlayed") > 0) return { season, splits: goalieRestSplits(own, rows) };
  }
  return { season: null, splits: [] };
}
