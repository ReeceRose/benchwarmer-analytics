// Current point streaks and Game Score streaks, from stored per-game rows
// (`skater_games`, which covers games with NHL shift data).

import { sql } from "drizzle-orm";
import { queryRows } from "@/server/db/client";
import type { ApiContext } from "@/server/api/handler";
import { addDays, round } from "@/server/api/format";
import type { StreakEntry, StreaksResponse } from "@/types";

/** Game Score that counts toward a streak: about a player's best quarter of games. */
export const GAME_SCORE_STREAK = 1.0;
/** Streaks shorter than this aren't worth listing. */
const MIN_GAMES = 3;
/** A player who hasn't played within this many days of the latest games isn't on a current streak. */
const STALE_DAYS = 7;
const LIMIT = 10;

interface StreakRow {
  player_id: number;
  name: string;
  team: string;
  position: string;
  games: number;
  points: number;
  game_score: number | string;
  last_game_date: string;
  at_least: boolean;
}

// For each player, count back from their latest game until one fails the
// condition (`breaks`), summing points and Game Score along the way.
function streakQuery(season: number, breaks: ReturnType<typeof sql>, since: string, playerId?: number) {
  return sql`
    with uncovered as (
      -- Each team's latest final game with no stored rows: a streak can't be
      -- followed back past it.
      select t.team, max(gm.game_date) as cutoff
      from games gm
      cross join lateral (values (gm.home_team_code), (gm.away_team_code)) as t(team)
      where gm.season = ${season} and gm.game_type = 2 and gm.game_state in ('OFF', 'FINAL')
        and not exists (select 1 from skater_games sg where sg.game_id = gm.game_id)
      group by t.team
    ), g as (
      select sg.player_id, sg.name, sg.team, sg.position, sg.game_date, sg.game_score,
        sg.goals + sg.primary_assists + sg.secondary_assists as pts,
        row_number() over (partition by sg.player_id order by sg.game_date desc) as rn,
        u.cutoff
      from skater_games sg
      left join uncovered u on u.team = sg.team
      where sg.season = ${season} and sg.is_playoffs = false ${playerId ? sql`and sg.player_id = ${playerId}` : sql``}
        and (u.cutoff is null or sg.game_date > u.cutoff)
    ), cut as (
      select player_id, coalesce(min(rn) filter (where ${breaks}), max(rn) + 1) as stop,
        bool_or(${breaks}) as broke, bool_or(cutoff is not null) as gap, max(game_date) as last_game_date
      from g group by player_id
    )
    select g.player_id, (array_agg(g.name order by g.rn))[1] as name, (array_agg(g.team order by g.rn))[1] as team,
      (array_agg(g.position order by g.rn))[1] as position,
      count(*)::int as games, sum(g.pts)::int as points, sum(g.game_score) as game_score, max(c.last_game_date)::text as last_game_date,
      bool_and(not c.broke and c.gap) as at_least
    from g join cut c on c.player_id = g.player_id
    where g.rn < c.stop and c.last_game_date >= ${since}
    group by g.player_id
    having count(*) >= ${playerId ? 1 : MIN_GAMES}
    order by games desc, points desc, game_score desc
    limit ${LIMIT}
  `;
}

const toEntry = (r: StreakRow): StreakEntry => ({
  playerId: Number(r.player_id),
  name: r.name,
  team: r.team,
  position: r.position,
  games: Number(r.games),
  points: Number(r.points),
  gameScore: round(Number(r.game_score), 2),
  lastGameDate: r.last_game_date,
  atLeast: r.at_least === true,
});

/** `?playerId=` limits the result to that player's current streaks (any length). */
export async function getStreaks({ db, query }: ApiContext): Promise<StreaksResponse> {
  const [latest] = await queryRows<{ season: number; game_date: string }>(
    db,
    sql`select season, game_date::text as game_date from skater_games where is_playoffs = false order by game_date desc limit 1`,
  );
  if (!latest) return { season: null, asOf: null, points: [], gameScore: [] };
  const season = Number(latest.season);
  const since = addDays(latest.game_date, -STALE_DAYS);
  const playerId = query.int("playerId");
  const [points, gameScore] = await Promise.all([
    queryRows<StreakRow>(db, streakQuery(season, sql`pts = 0`, since, playerId)),
    queryRows<StreakRow>(db, streakQuery(season, sql`game_score < ${GAME_SCORE_STREAK}`, since, playerId)),
  ]);
  return { season, asOf: latest.game_date, points: points.map(toEntry), gameScore: gameScore.map(toEntry) };
}
