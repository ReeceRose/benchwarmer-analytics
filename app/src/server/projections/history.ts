// Walk-forward history for the model-fitting and backtest scripts
// (scripts/fit-pregame-model.ts, calibrate-season-sims.ts,
// evaluate-pregame-vs-market.ts). Not used at runtime.
//
// Rates both teams before every regular-season game from what was known at
// puck drop: season-to-date team stats blended with last season, goaltending
// from every earlier shot, and whether each team played the day before. The
// one exception is roster weights: they use the season's full ice time (who
// dressed), since per-game ice time only exists from 2025.
import type { Queryable } from "@/server/ingestion/db";
import { byGame, GoalieTable, goalieGames, starterOf, XGA_PER_GAME, type GoalieGame, type GoalieParams } from "@/server/projections/goalies";
import { dayBefore, RatingTable, restGap, type Rating, type RatingParams } from "@/lib/projections/ratings";
import { rosterRatings, type RosterParams } from "@/server/projections/roster";

export interface HistoryGame {
  season: number;
  game_id: string;
  game_date: string;
  home: string;
  away: string;
  home_won: boolean;
  went_to_ot: boolean;
  h_xgf: number; h_xga: number; h_gf: number; h_ga: number;
  a_xgf: number; a_xga: number; a_gf: number; a_ga: number;
}

export interface History {
  games: HistoryGame[];
  goalies: Map<string, GoalieGame[]>;
  db: Queryable;
  firstSeason: number;
}

// One row per regular-season game: both teams' stats and the result.
const SQL = `
select g.season, g.game_id, g.game_date::text, g.home_team_code as home, g.away_team_code as away,
  g.home_score > g.away_score as home_won, coalesce(g.period_type, 'REG') <> 'REG' as went_to_ot,
  h5.score_venue_adjusted_x_goals_for::float8 as h_xgf, h5.score_venue_adjusted_x_goals_against::float8 as h_xga,
  ha.goals_for::float8 as h_gf, ha.goals_against::float8 as h_ga,
  a5.score_venue_adjusted_x_goals_for::float8 as a_xgf, a5.score_venue_adjusted_x_goals_against::float8 as a_xga,
  aa.goals_for::float8 as a_gf, aa.goals_against::float8 as a_ga
from games g
join team_games h5 on h5.game_id = g.game_id and h5.team_abbreviation = g.home_team_code and h5.situation = '5on5'
join team_games ha on ha.game_id = g.game_id and ha.team_abbreviation = g.home_team_code and ha.situation = 'all'
join team_games a5 on a5.game_id = g.game_id and a5.team_abbreviation = g.away_team_code and a5.situation = '5on5'
join team_games aa on aa.game_id = g.game_id and aa.team_abbreviation = g.away_team_code and aa.situation = 'all'
where g.game_type = 2 and g.game_state in ('OFF', 'FINAL') and g.season between $1 and $2
order by g.game_date, g.game_id`;

/** Loads games and goalie shots from `firstSeason` (used only as a prior) to `lastSeason`. */
export async function loadHistory(db: Queryable, firstSeason: number, lastSeason: number): Promise<History> {
  // One after the other: the scripts share a single pg.Client.
  const { rows: games } = await db.query<HistoryGame>(SQL, [firstSeason, lastSeason]);
  const goalies = await goalieGames(db, firstSeason, lastSeason);
  return { games, goalies: byGame(goalies), db, firstSeason };
}

const rosterCache = new Map<string, Map<string, number>>();

/** Roster talent per team for a season, cached per parameter set. */
export async function seasonRosters(history: History, season: number, params: RosterParams) {
  const key = `${season}:${params.shrinkHours}`;
  let r = rosterCache.get(key);
  if (!r) {
    r = await rosterRatings(history.db, season, params);
    rosterCache.set(key, r);
  }
  return r;
}

export interface WalkParams {
  rating: RatingParams;
  goalie: GoalieParams;
  roster: RosterParams;
}

export interface PregameSample {
  game: HistoryGame;
  home: Rating;
  away: Rating;
  rest: number;
  /**
   * Goals per game by which each team's actual starting goalie beat its
   * usual goaltending (the experimental injury model's input; the main model
   * doesn't know who starts).
   */
  starterGap: { home: number; away: number };
}

/**
 * Every game after the first season with both teams' ratings as of puck
 * drop. `beforeGame` can rate any team at that moment (for snapshots).
 */
export async function walk(
  history: History,
  params: WalkParams,
  beforeGame?: (g: HistoryGame, rate: (team: string) => Rating) => void,
): Promise<PregameSample[]> {
  const out: PregameSample[] = [];
  const goalies = new GoalieTable(params.goalie);
  const lastPlayed = new Map<string, string>();
  let prior = new Map<string, Rating>();
  let table = new RatingTable();
  let season = -1;
  let rosters = new Map<string, number>();
  for (const g of history.games) {
    if (g.season !== season) {
      if (season !== -1) prior = table.averages();
      table = new RatingTable();
      season = g.season;
      rosters = g.season > history.firstSeason + 1 ? await seasonRosters(history, g.season, params.roster) : new Map();
    }
    if (g.season > history.firstSeason) {
      const rate = (team: string) =>
        table.rating(team, prior.get(team), params.rating, { roster: rosters.get(team) ?? 0, goalie: goalies.team(team) });
      beforeGame?.(g, rate);
      const yesterday = dayBefore(g.game_date);
      const rows = history.goalies.get(g.game_id) ?? [];
      const gap = (team: string) => {
        const starter = starterOf(rows, team);
        return starter === undefined ? 0 : goalies.talent(starter) * XGA_PER_GAME - goalies.team(team);
      };
      out.push({
        game: g,
        home: rate(g.home),
        away: rate(g.away),
        starterGap: { home: gap(g.home), away: gap(g.away) },
        rest: restGap(lastPlayed.get(g.home) === yesterday, lastPlayed.get(g.away) === yesterday),
      });
    }
    table.add({ team: g.home, xgf: g.h_xgf, xga: g.h_xga, gf: g.h_gf, ga: g.h_ga });
    table.add({ team: g.away, xgf: g.a_xgf, xga: g.a_xga, gf: g.a_gf, ga: g.a_ga });
    goalies.addGame(history.goalies.get(g.game_id) ?? []);
    lastPlayed.set(g.home, g.game_date);
    lastPlayed.set(g.away, g.game_date);
  }
  return out;
}
