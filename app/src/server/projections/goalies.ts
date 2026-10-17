import { XGA_PER_GAME } from "@/lib/projections/goalie-outlook";
import type { Queryable } from "@/server/ingestion/db";

// Goaltending for team ratings. A goalie's talent is goals saved above
// expected per expected goal faced (shots table, all situations, empty net
// excluded), over his career with older seasons decayed and shrunk toward
// average by `shrinkXg` expected goals. A team's goaltending is its goalies'
// talent weighted by this season's starts (the goalie who faced the most
// shots in a game started it), in goals saved per game.

export { XGA_PER_GAME };

export interface GoalieParams {
  /** Weight of each earlier season relative to the next (1 = no decay). */
  decay: number;
  /** Expected goals of average play mixed into every goalie's record. */
  shrinkXg: number;
}

/** One goalie's shots against in one regular-season game. */
export interface GoalieGame {
  season: number;
  gameId: string;
  /** The goalie's team. */
  team: string;
  goalie: number;
  shots: number;
  xga: number;
  goals: number;
}

/** The goalie who started for `team` in one game's rows: the one who faced the most shots. */
export function starterOf(rows: readonly GoalieGame[], team: string): number | undefined {
  let best: GoalieGame | undefined;
  for (const r of rows) if (r.team === team && (!best || r.shots > best.shots)) best = r;
  return best?.goalie;
}

/** Walks games in order, keeping each goalie's record and each team's starts this season. */
export class GoalieTable {
  private records = new Map<number, { gsax: number; xg: number }>();
  private starts = new Map<string, Map<number, number>>();
  private season: number | null = null;
  private params: GoalieParams;

  constructor(params: GoalieParams) {
    this.params = params;
  }

  /** Adds one game's rows (both teams). Starting a new season decays every record and clears starts. */
  addGame(rows: readonly GoalieGame[]) {
    if (rows.length === 0) return;
    if (this.season !== null && rows[0].season !== this.season) {
      for (const r of this.records.values()) {
        r.gsax *= this.params.decay;
        r.xg *= this.params.decay;
      }
      this.starts.clear();
    }
    this.season = rows[0].season;
    for (const row of rows) {
      const r = this.records.get(row.goalie) ?? { gsax: 0, xg: 0 };
      r.gsax += row.xga - row.goals;
      r.xg += row.xga;
      this.records.set(row.goalie, r);
    }
    for (const team of new Set(rows.map((r) => r.team))) {
      const goalie = starterOf(rows, team)!;
      const s = this.starts.get(team) ?? new Map<number, number>();
      s.set(goalie, (s.get(goalie) ?? 0) + 1);
      this.starts.set(team, s);
    }
  }

  /** This season's starts by goalie for a team. */
  startsFor(team: string): ReadonlyMap<number, number> {
    return this.starts.get(team) ?? new Map();
  }

  /** Goals saved above expected per expected goal faced, shrunk toward 0. */
  talent(goalie: number): number {
    const r = this.records.get(goalie);
    return r ? r.gsax / (r.xg + this.params.shrinkXg) : 0;
  }

  /** The team's goaltending in goals saved per game; 0 before its first game of the season. */
  team(team: string): number {
    const s = this.starts.get(team);
    if (!s) return 0;
    let total = 0;
    let value = 0;
    for (const [goalie, n] of s) {
      total += n;
      value += n * this.talent(goalie);
    }
    return (value / total) * XGA_PER_GAME;
  }
}

/**
 * Per-game, per-goalie shots against, regular season, oldest first. With
 * `onlyCurrent`, just the goalies who've played in `toSeason` or the season
 * before (all a team's goaltending needs, plus injured goalies who haven't
 * played yet this season).
 */
export async function goalieGames(db: Queryable, fromSeason: number, toSeason: number, onlyCurrent = false): Promise<GoalieGame[]> {
  const { rows } = await db.query<GoalieGame>(
    `SELECT s.season, s.game_id AS "gameId",
            CASE WHEN s.is_home_team THEN s.away_team_code ELSE s.home_team_code END AS team,
            s.goalie_player_id AS goalie, count(*)::int AS shots,
            sum(s.x_goal)::float8 AS xga, sum(s.is_goal::int)::int AS goals
     FROM shots s
     JOIN games g ON g.game_id = s.game_id
     WHERE s.season BETWEEN $1 AND $2 AND NOT s.is_playoff_game AND NOT s.shot_on_empty_net AND s.goalie_player_id > 0
       AND (NOT $3 OR s.goalie_player_id IN (SELECT goalie_player_id FROM shots WHERE season IN ($2, $2 - 1) AND NOT is_playoff_game))
     GROUP BY 1, 2, 3, 4, g.game_date
     ORDER BY g.game_date, s.game_id`,
    [fromSeason, toSeason, onlyCurrent],
  );
  return rows;
}

/** Groups goalie rows by game, keeping order. */
export function byGame(rows: readonly GoalieGame[]): Map<string, GoalieGame[]> {
  const out = new Map<string, GoalieGame[]>();
  for (const r of rows) {
    const list = out.get(r.gameId) ?? [];
    list.push(r);
    out.set(r.gameId, list);
  }
  return out;
}
