using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Benchwarmer.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPositionsToChemistryPairs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop existing materialized view (must drop indexes first implicitly)
            migrationBuilder.Sql("DROP MATERIALIZED VIEW IF EXISTS chemistry_pairs;");

            // Recreate materialized view with player positions
            migrationBuilder.Sql("""
                CREATE MATERIALIZED VIEW chemistry_pairs AS
                WITH line_pairs AS (
                    -- Player1-Player2 pairs (all lines)
                    SELECT
                        LEAST(l.player1_id, l.player2_id) as player1_id,
                        GREATEST(l.player1_id, l.player2_id) as player2_id,
                        l.team,
                        l.season,
                        l.situation,
                        l.ice_time_seconds,
                        l.games_played,
                        l.goals_for,
                        l.goals_against,
                        COALESCE(l.expected_goals_for, 0) as x_goals_for,
                        COALESCE(l.expected_goals_against, 0) as x_goals_against,
                        l.corsi_for,
                        l.corsi_against
                    FROM line_combinations l

                    UNION ALL

                    -- Player1-Player3 pairs (forward lines only)
                    SELECT
                        LEAST(l.player1_id, l.player3_id) as player1_id,
                        GREATEST(l.player1_id, l.player3_id) as player2_id,
                        l.team,
                        l.season,
                        l.situation,
                        l.ice_time_seconds,
                        l.games_played,
                        l.goals_for,
                        l.goals_against,
                        COALESCE(l.expected_goals_for, 0) as x_goals_for,
                        COALESCE(l.expected_goals_against, 0) as x_goals_against,
                        l.corsi_for,
                        l.corsi_against
                    FROM line_combinations l
                    WHERE l.player3_id IS NOT NULL

                    UNION ALL

                    -- Player2-Player3 pairs (forward lines only)
                    SELECT
                        LEAST(l.player2_id, l.player3_id) as player1_id,
                        GREATEST(l.player2_id, l.player3_id) as player2_id,
                        l.team,
                        l.season,
                        l.situation,
                        l.ice_time_seconds,
                        l.games_played,
                        l.goals_for,
                        l.goals_against,
                        COALESCE(l.expected_goals_for, 0) as x_goals_for,
                        COALESCE(l.expected_goals_against, 0) as x_goals_against,
                        l.corsi_for,
                        l.corsi_against
                    FROM line_combinations l
                    WHERE l.player3_id IS NOT NULL
                )
                SELECT
                    lp.player1_id,
                    lp.player2_id,
                    p1.name as player1_name,
                    p2.name as player2_name,
                    p1.position as player1_position,
                    p2.position as player2_position,
                    lp.team,
                    lp.season,
                    lp.situation,
                    SUM(lp.ice_time_seconds)::bigint as total_ice_time_seconds,
                    SUM(lp.games_played)::integer as games_played,
                    SUM(lp.goals_for)::integer as goals_for,
                    SUM(lp.goals_against)::integer as goals_against,
                    SUM(lp.x_goals_for) as x_goals_for,
                    SUM(lp.x_goals_against) as x_goals_against,
                    SUM(lp.corsi_for)::integer as corsi_for,
                    SUM(lp.corsi_against)::integer as corsi_against
                FROM line_pairs lp
                JOIN players p1 ON lp.player1_id = p1.id
                JOIN players p2 ON lp.player2_id = p2.id
                GROUP BY lp.player1_id, lp.player2_id, p1.name, p2.name, p1.position, p2.position, lp.team, lp.season, lp.situation;
                """);

            // Recreate indexes
            migrationBuilder.Sql("""
                CREATE INDEX ix_chemistry_pairs_team_season_situation
                ON chemistry_pairs (team, season, situation);
                """);

            migrationBuilder.Sql("""
                CREATE INDEX ix_chemistry_pairs_player1
                ON chemistry_pairs (player1_id);
                """);

            migrationBuilder.Sql("""
                CREATE INDEX ix_chemistry_pairs_player2
                ON chemistry_pairs (player2_id);
                """);

            migrationBuilder.Sql("""
                CREATE UNIQUE INDEX ix_chemistry_pairs_unique
                ON chemistry_pairs (player1_id, player2_id, team, season, situation);
                """);

            // Add index for position filtering
            migrationBuilder.Sql("""
                CREATE INDEX ix_chemistry_pairs_positions
                ON chemistry_pairs (player1_position, player2_position);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop and recreate without position columns
            migrationBuilder.Sql("DROP MATERIALIZED VIEW IF EXISTS chemistry_pairs;");

            migrationBuilder.Sql("""
                CREATE MATERIALIZED VIEW chemistry_pairs AS
                WITH line_pairs AS (
                    SELECT
                        LEAST(l.player1_id, l.player2_id) as player1_id,
                        GREATEST(l.player1_id, l.player2_id) as player2_id,
                        l.team,
                        l.season,
                        l.situation,
                        l.ice_time_seconds,
                        l.games_played,
                        l.goals_for,
                        l.goals_against,
                        COALESCE(l.expected_goals_for, 0) as x_goals_for,
                        COALESCE(l.expected_goals_against, 0) as x_goals_against,
                        l.corsi_for,
                        l.corsi_against
                    FROM line_combinations l

                    UNION ALL

                    SELECT
                        LEAST(l.player1_id, l.player3_id) as player1_id,
                        GREATEST(l.player1_id, l.player3_id) as player2_id,
                        l.team,
                        l.season,
                        l.situation,
                        l.ice_time_seconds,
                        l.games_played,
                        l.goals_for,
                        l.goals_against,
                        COALESCE(l.expected_goals_for, 0) as x_goals_for,
                        COALESCE(l.expected_goals_against, 0) as x_goals_against,
                        l.corsi_for,
                        l.corsi_against
                    FROM line_combinations l
                    WHERE l.player3_id IS NOT NULL

                    UNION ALL

                    SELECT
                        LEAST(l.player2_id, l.player3_id) as player1_id,
                        GREATEST(l.player2_id, l.player3_id) as player2_id,
                        l.team,
                        l.season,
                        l.situation,
                        l.ice_time_seconds,
                        l.games_played,
                        l.goals_for,
                        l.goals_against,
                        COALESCE(l.expected_goals_for, 0) as x_goals_for,
                        COALESCE(l.expected_goals_against, 0) as x_goals_against,
                        l.corsi_for,
                        l.corsi_against
                    FROM line_combinations l
                    WHERE l.player3_id IS NOT NULL
                )
                SELECT
                    lp.player1_id,
                    lp.player2_id,
                    p1.name as player1_name,
                    p2.name as player2_name,
                    lp.team,
                    lp.season,
                    lp.situation,
                    SUM(lp.ice_time_seconds)::bigint as total_ice_time_seconds,
                    SUM(lp.games_played)::integer as games_played,
                    SUM(lp.goals_for)::integer as goals_for,
                    SUM(lp.goals_against)::integer as goals_against,
                    SUM(lp.x_goals_for) as x_goals_for,
                    SUM(lp.x_goals_against) as x_goals_against,
                    SUM(lp.corsi_for)::integer as corsi_for,
                    SUM(lp.corsi_against)::integer as corsi_against
                FROM line_pairs lp
                JOIN players p1 ON lp.player1_id = p1.id
                JOIN players p2 ON lp.player2_id = p2.id
                GROUP BY lp.player1_id, lp.player2_id, p1.name, p2.name, lp.team, lp.season, lp.situation;
                """);

            migrationBuilder.Sql("""
                CREATE INDEX ix_chemistry_pairs_team_season_situation
                ON chemistry_pairs (team, season, situation);
                """);

            migrationBuilder.Sql("""
                CREATE INDEX ix_chemistry_pairs_player1
                ON chemistry_pairs (player1_id);
                """);

            migrationBuilder.Sql("""
                CREATE INDEX ix_chemistry_pairs_player2
                ON chemistry_pairs (player2_id);
                """);

            migrationBuilder.Sql("""
                CREATE UNIQUE INDEX ix_chemistry_pairs_unique
                ON chemistry_pairs (player1_id, player2_id, team, season, situation);
                """);
        }
    }
}
