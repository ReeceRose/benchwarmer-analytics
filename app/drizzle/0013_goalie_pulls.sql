-- Starts and times pulled per goalie season, from the shots each goalie faced.
-- A goalie started a game by facing the team's first shot, and was pulled if
-- they started and a teammate faced a shot after their last one.
-- goalie_player_id 0 marks an empty net. Injury exits count as pulls.
CREATE MATERIALIZED VIEW goalie_pulls AS
WITH faced AS (
    SELECT game_id, season, is_playoff_game, is_home_team, goalie_player_id,
           min(game_time_seconds) AS first_t, max(game_time_seconds) AS last_t
    FROM shots
    WHERE goalie_player_id > 0 AND NOT shot_on_empty_net
    GROUP BY game_id, season, is_playoff_game, is_home_team, goalie_player_id
),
ranked AS (
    SELECT *,
           first_t = min(first_t) OVER w AS started,
           last_t < max(last_t) OVER w AS relieved_after
    FROM faced
    WINDOW w AS (PARTITION BY game_id, is_home_team)
)
SELECT goalie_player_id AS player_id,
       season,
       is_playoff_game AS is_playoffs,
       (count(*) FILTER (WHERE started))::int AS games_started,
       (count(*) FILTER (WHERE started AND relieved_after))::int AS times_pulled
FROM ranked
GROUP BY goalie_player_id, season, is_playoff_game;
--> statement-breakpoint
CREATE UNIQUE INDEX ix_goalie_pulls_unique
ON goalie_pulls (player_id, season, is_playoffs);
