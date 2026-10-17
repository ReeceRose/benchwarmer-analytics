import type { Queryable } from "@/server/ingestion/db";

// Roster talent for team ratings: the team's skaters this season, weighted by
// their 5v5 ice time with it, rated by their 5v5 on-ice xG share over the two
// previous seasons (wherever they played; the older one counts half), each
// shrunk toward a depth player's share by `shrinkHours` of ice time. It picks
// up trades and signings that last season's team numbers can't. Converted to
// 5v5 xG differential per game with last season's league xG per game.

export interface RosterParams {
  /** Ice time (hours) of a depth player's share mixed into every skater's record. */
  shrinkHours: number;
}

/** On-ice xG share of a depth player (rookies, call-ups), roughly the league's 25th percentile. */
export const DEPTH_XG_SHARE = 0.47;

/** Each team's roster talent for `season`, as 5v5 xG differential per game. */
export async function rosterRatings(db: Queryable, season: number, params: RosterParams): Promise<Map<string, number>> {
  const { rows } = await db.query<{ team: string; share: number; xg_per_game: number }>(
    `WITH current AS (
       SELECT player_id, team, sum(ice_time_seconds)::float8 AS secs
       FROM skater_seasons
       WHERE season = $1::int AND situation = '5on5' AND NOT is_playoffs
       GROUP BY 1, 2
     ), past AS (
       SELECT s.player_id,
              sum(s.ice_time_seconds * CASE WHEN s.season = $1 - 1 THEN 1 ELSE 0.5 END)::float8 AS secs,
              sum(s.ice_time_seconds * CASE WHEN s.season = $1 - 1 THEN 1 ELSE 0.5 END * a.on_ice_x_goals_percentage)::float8 AS xg_secs
       FROM skater_seasons s
       JOIN skater_season_advanced a USING (player_id, season, team, situation, is_playoffs)
       WHERE s.season IN ($1 - 1, $1 - 2) AND s.situation = '5on5' AND NOT s.is_playoffs AND a.on_ice_x_goals_percentage IS NOT NULL
       GROUP BY 1
     ), league AS (
       SELECT avg(score_venue_adjusted_x_goals_for + score_venue_adjusted_x_goals_against)::float8 AS xg_per_game
       FROM team_games
       WHERE season = $1 - 1 AND situation = '5on5' AND NOT is_playoffs
     )
     SELECT c.team,
            sum(c.secs * (coalesce(p.xg_secs, 0) + $2::float8 * $3::float8) / (coalesce(p.secs, 0) + $3::float8)) / sum(c.secs) AS share,
            (SELECT xg_per_game FROM league) AS xg_per_game
     FROM current c
     LEFT JOIN past p USING (player_id)
     GROUP BY c.team`,
    [season, DEPTH_XG_SHARE, params.shrinkHours * 3600],
  );
  return new Map(rows.map((r) => [r.team, (2 * r.share - 1) * (r.xg_per_game ?? 0)]));
}
