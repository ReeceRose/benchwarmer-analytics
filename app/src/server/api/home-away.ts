import { sql, type SQL } from "drizzle-orm";
import { queryRows, type Database } from "@/server/db/client";
import type { ApiContext } from "@/server/api/handler";
import { badRequest } from "@/server/api/errors";
import { round } from "@/server/api/format";
import { GameState } from "@/server/api/constants";
import { requireTeam } from "@/server/api/teams";
import { currentSeason } from "@/server/ingestion/normalize";
import type {
  HomeAwayHistoryResponse,
  HomeAwayResponse,
  HomeAwaySide,
  PenaltiesByVenueResponse,
  VenuePenaltyTotals,
} from "@/types";

/** Summed team_games stats for one team on one side (or the league). */
export interface HomeAwayTotals {
  gp: number;
  wins: number;
  losses: number;
  ot_losses: number;
  gf: number;
  ga: number;
  sf: number;
  sa: number;
  fow: number;
  fol: number;
  pen_drawn: number;
  pen_taken: number;
  pim_drawn: number;
  pim_taken: number;
  toi: number;
  ev_xgf: number;
  ev_xga: number;
  ev_cf: number;
  ev_ca: number;
  ev_gf: number;
  ev_ga: number;
  ev_sf: number;
  ev_sa: number;
  pp_toi: number;
  pp_gf: number;
  pk_toi: number;
  pk_ga: number;
}

type TotalsRow = HomeAwayTotals & { season: number; team: string | null; is_home: boolean };

const KEYS: (keyof HomeAwayTotals)[] = [
  "gp", "wins", "losses", "ot_losses", "gf", "ga", "sf", "sa", "fow", "fol", "pen_drawn", "pen_taken", "pim_drawn", "pim_taken", "toi",
  "ev_xgf", "ev_xga", "ev_cf", "ev_ca", "ev_gf", "ev_ga", "ev_sf", "ev_sa", "pp_toi", "pp_gf", "pk_toi", "pk_ga",
];

function addTotals(rows: readonly HomeAwayTotals[]): HomeAwayTotals {
  const out = Object.fromEntries(KEYS.map((k) => [k, 0])) as unknown as HomeAwayTotals;
  for (const row of rows) for (const k of KEYS) out[k] += row[k];
  return out;
}

const pct = (a: number, b: number, digits = 1) => (a + b > 0 ? round((a / (a + b)) * 100, digits) : null);
const per = (n: number, d: number, digits = 2) => (d > 0 ? round(n / d, digits) : 0);
const per60 = (n: number, seconds: number) => (seconds > 0 ? round((n / seconds) * 3600, 2) : 0);

export function homeAwaySide(t: HomeAwayTotals): HomeAwaySide {
  const decided = t.wins + t.losses + t.ot_losses;
  return {
    gamesPlayed: t.gp,
    wins: t.wins,
    losses: t.losses,
    otLosses: t.ot_losses,
    pointsPct: decided > 0 ? round((2 * t.wins + t.ot_losses) / (2 * decided), 3) : null,
    goalsForPerGame: per(t.gf, t.gp),
    goalsAgainstPerGame: per(t.ga, t.gp),
    shotsForPerGame: per(t.sf, t.gp, 1),
    shotsAgainstPerGame: per(t.sa, t.gp, 1),
    faceoffPct: pct(t.fow, t.fol),
    xGoalsPct: pct(t.ev_xgf, t.ev_xga),
    corsiPct: pct(t.ev_cf, t.ev_ca),
    shootingPct: t.ev_sf > 0 ? round((t.ev_gf / t.ev_sf) * 100, 1) : null,
    savePct: t.ev_sa > 0 ? round((1 - t.ev_ga / t.ev_sa) * 100, 1) : null,
    ppMinutesPerGame: per(t.pp_toi / 60, t.gp),
    pkMinutesPerGame: per(t.pk_toi / 60, t.gp),
    ppGoalsPer60: per60(t.pp_gf, t.pp_toi),
    pkGoalsAgainstPer60: per60(t.pk_ga, t.pk_toi),
    penaltiesDrawn: t.pen_drawn,
    penaltiesTaken: t.pen_taken,
    penaltiesDrawnPer60: per60(t.pen_drawn, t.toi),
    penaltiesTakenPer60: per60(t.pen_taken, t.toi),
    netPenaltiesPer60: per60(t.pen_drawn - t.pen_taken, t.toi),
  };
}

// Summed stats by season, side and (unless league-wide) team. MoneyPuck's
// penaltiesAgainst = penalties drawn.
function homeAwayTotals(db: Database, where: SQL, byTeam: boolean) {
  const team = byTeam ? sql`team_abbreviation` : sql`null::text`;
  return queryRows<TotalsRow>(db, sql`
    with t as (
      select tg.*,
        case when tg.is_home then g.home_score else g.away_score end as team_score,
        case when tg.is_home then g.away_score else g.home_score end as opp_score,
        coalesce(g.period_type, 'REG') as period_type,
        g.game_state in (${GameState.final}, ${GameState.finalAlt}) as final
      from team_games tg
      left join games g on g.game_id = tg.game_id
      where ${where} and tg.situation in ('all', '5on5', '5on4', '4on5')
    )
    select season, ${team} as team, is_home,
      count(*) filter (where situation = 'all')::int as gp,
      count(*) filter (where situation = 'all' and final and team_score > opp_score)::int as wins,
      count(*) filter (where situation = 'all' and final and team_score < opp_score
        and period_type not in ('OT', 'SO'))::int as losses,
      count(*) filter (where situation = 'all' and final and team_score < opp_score
        and period_type in ('OT', 'SO'))::int as ot_losses,
      coalesce(sum(goals_for) filter (where situation = 'all'), 0)::int as gf,
      coalesce(sum(goals_against) filter (where situation = 'all'), 0)::int as ga,
      coalesce(sum(shots_on_goal_for) filter (where situation = 'all'), 0)::int as sf,
      coalesce(sum(shots_on_goal_against) filter (where situation = 'all'), 0)::int as sa,
      coalesce(sum(face_offs_won_for) filter (where situation = 'all'), 0)::int as fow,
      coalesce(sum(face_offs_won_against) filter (where situation = 'all'), 0)::int as fol,
      coalesce(sum(penalties_against) filter (where situation = 'all'), 0)::int as pen_drawn,
      coalesce(sum(penalties_for) filter (where situation = 'all'), 0)::int as pen_taken,
      coalesce(sum(penalty_minutes_against) filter (where situation = 'all'), 0)::int as pim_drawn,
      coalesce(sum(penalty_minutes_for) filter (where situation = 'all'), 0)::int as pim_taken,
      coalesce(sum(ice_time) filter (where situation = 'all'), 0)::float8 as toi,
      coalesce(sum(x_goals_for) filter (where situation = '5on5'), 0)::float8 as ev_xgf,
      coalesce(sum(x_goals_against) filter (where situation = '5on5'), 0)::float8 as ev_xga,
      coalesce(sum(shot_attempts_for) filter (where situation = '5on5'), 0)::int as ev_cf,
      coalesce(sum(shot_attempts_against) filter (where situation = '5on5'), 0)::int as ev_ca,
      coalesce(sum(goals_for) filter (where situation = '5on5'), 0)::int as ev_gf,
      coalesce(sum(goals_against) filter (where situation = '5on5'), 0)::int as ev_ga,
      coalesce(sum(shots_on_goal_for) filter (where situation = '5on5'), 0)::int as ev_sf,
      coalesce(sum(shots_on_goal_against) filter (where situation = '5on5'), 0)::int as ev_sa,
      coalesce(sum(ice_time) filter (where situation = '5on4'), 0)::float8 as pp_toi,
      coalesce(sum(goals_for) filter (where situation = '5on4'), 0)::int as pp_gf,
      coalesce(sum(ice_time) filter (where situation = '4on5'), 0)::float8 as pk_toi,
      coalesce(sum(goals_against) filter (where situation = '4on5'), 0)::int as pk_ga
    from t
    group by 1, 2, 3
  `);
}

const sideOf = (rows: readonly TotalsRow[], isHome: boolean) => homeAwaySide(addTotals(rows.filter((r) => r.is_home === isHome)));

// One entry per season (oldest first) with each side's rates.
export function homeAwayBySeason(rows: readonly TotalsRow[]) {
  const seasons = [...new Set(rows.map((r) => r.season))].sort((a, b) => a - b);
  return seasons.map((season) => {
    const own = rows.filter((r) => r.season === season);
    return { season, home: sideOf(own, true), away: sideOf(own, false) };
  });
}

async function teamParams({ db, params, query }: ApiContext) {
  const abbrev = params.abbrev.toUpperCase();
  if (!abbrev.trim() || abbrev.length > 3) badRequest("Invalid team abbreviation");
  await requireTeam(db, abbrev);
  return { abbrev, playoffs: query.bool("playoffs") ?? false };
}

export async function getTeamHomeAway(ctx: ApiContext): Promise<HomeAwayResponse> {
  const { abbrev, playoffs } = await teamParams(ctx);
  const season = ctx.query.int("season") ?? currentSeason();

  // Every team at once, so the league's figures come from the same query.
  const rows = await homeAwayTotals(ctx.db, sql`tg.season = ${season} and tg.is_playoffs = ${playoffs}`, true);
  const own = rows.filter((r) => r.team === abbrev);

  return {
    teamAbbreviation: abbrev,
    season,
    playoffs,
    home: sideOf(own, true),
    away: sideOf(own, false),
    league: { home: sideOf(rows, true), away: sideOf(rows, false) },
  };
}

/** One team's home and away rates for every season it played. */
export async function getTeamHomeAwayHistory(ctx: ApiContext): Promise<HomeAwayHistoryResponse> {
  const { abbrev, playoffs } = await teamParams(ctx);
  const rows = await homeAwayTotals(
    ctx.db,
    sql`tg.team_abbreviation = ${abbrev} and tg.is_playoffs = ${playoffs}`,
    true,
  );
  return { teamAbbreviation: abbrev, playoffs, seasons: homeAwayBySeason(rows) };
}

/**
 * Every team's home games against every team's road games, by season. Its
 * own endpoint so 32 team pages share one cached league scan.
 */
export async function getLeagueHomeAwayHistory({ db, query }: ApiContext): Promise<HomeAwayHistoryResponse> {
  const playoffs = query.bool("playoffs") ?? false;
  const rows = await homeAwayTotals(db, sql`tg.is_playoffs = ${playoffs}`, false);
  return { teamAbbreviation: null, playoffs, seasons: homeAwayBySeason(rows) };
}

function venueTotals(t: HomeAwayTotals | undefined): VenuePenaltyTotals {
  return {
    gamesPlayed: t?.gp ?? 0,
    iceTimeSeconds: Math.round(t?.toi ?? 0),
    drawn: t?.pen_drawn ?? 0,
    taken: t?.pen_taken ?? 0,
    pimDrawn: t?.pim_drawn ?? 0,
    pimTaken: t?.pim_taken ?? 0,
    ppSeconds: Math.round(t?.pp_toi ?? 0),
    pkSeconds: Math.round(t?.pk_toi ?? 0),
    ppGoals: t?.pp_gf ?? 0,
    pkGoalsAgainst: t?.pk_ga ?? 0,
  };
}

// Season → team → home and road penalty totals, oldest season first.
export function penaltiesByVenue(rows: readonly TotalsRow[]): PenaltiesByVenueResponse["seasons"] {
  const seasons = new Map<number, Map<string, { home?: TotalsRow; away?: TotalsRow }>>();
  for (const row of rows) {
    if (row.team == null) continue;
    let teams = seasons.get(row.season);
    if (!teams) seasons.set(row.season, (teams = new Map()));
    const entry = teams.get(row.team) ?? {};
    entry[row.is_home ? "home" : "away"] = row;
    teams.set(row.team, entry);
  }
  return [...seasons.entries()]
    .sort(([a], [b]) => a - b)
    .map(([season, teams]) => ({
      season,
      teams: [...teams.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([team, { home, away }]) => ({ team, home: venueTotals(home), away: venueTotals(away) })),
    }));
}

/**
 * Every team's home and road penalty totals for every season: raw counts and
 * seconds, so the client can rate them for home, road or both. One cached
 * scan of team_games for the whole league.
 */
export async function getPenaltiesByVenue({ db, query }: ApiContext): Promise<PenaltiesByVenueResponse> {
  const playoffs = query.bool("playoffs") ?? false;
  const rows = await homeAwayTotals(db, sql`tg.is_playoffs = ${playoffs}`, true);
  return { playoffs, seasons: penaltiesByVenue(rows) };
}
