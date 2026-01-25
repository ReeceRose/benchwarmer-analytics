using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Benchwarmer.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSeasonPercentilesMaterializedView : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Create materialized view for pre-computed season percentile thresholds
            // Uses minGames=20 (the default) - queries with other minGames values fall back to runtime calculation
            migrationBuilder.Sql("""
                CREATE MATERIALIZED VIEW season_percentiles AS
                WITH player_stats AS (
                    SELECT
                        s.season,
                        (s.goals + s.assists)::decimal / s.games_played as points_per_game,
                        s.goals::decimal / s.games_played as goals_per_game,
                        (s.goals + s.assists)::decimal / (s.ice_time_seconds / 3600.0) as points_per_60,
                        s.goals::decimal / (s.ice_time_seconds / 3600.0) as goals_per_60
                    FROM skater_seasons s
                    WHERE s.situation = 'all'
                      AND s.is_playoffs = false
                      AND s.games_played >= 20
                      AND s.ice_time_seconds > 0
                      AND s.games_played > 0
                ),
                percentile_values AS (
                    SELECT
                        season,
                        COUNT(*) as player_count,
                        PERCENTILE_CONT(ARRAY(SELECT i/100.0 FROM generate_series(1, 99) i))
                            WITHIN GROUP (ORDER BY points_per_game) as ppg_percentiles,
                        PERCENTILE_CONT(ARRAY(SELECT i/100.0 FROM generate_series(1, 99) i))
                            WITHIN GROUP (ORDER BY goals_per_game) as gpg_percentiles,
                        PERCENTILE_CONT(ARRAY(SELECT i/100.0 FROM generate_series(1, 99) i))
                            WITHIN GROUP (ORDER BY points_per_60) as pp60_percentiles,
                        PERCENTILE_CONT(ARRAY(SELECT i/100.0 FROM generate_series(1, 99) i))
                            WITHIN GROUP (ORDER BY goals_per_60) as gp60_percentiles
                    FROM player_stats
                    GROUP BY season
                )
                SELECT
                    pv.season,
                    pv.player_count::int,
                    p.idx as percentile,
                    ROUND(pv.ppg_percentiles[p.idx]::numeric, 3) as points_per_game,
                    ROUND(pv.gpg_percentiles[p.idx]::numeric, 3) as goals_per_game,
                    ROUND(pv.pp60_percentiles[p.idx]::numeric, 3) as points_per_60,
                    ROUND(pv.gp60_percentiles[p.idx]::numeric, 3) as goals_per_60
                FROM percentile_values pv
                CROSS JOIN generate_series(1, 99) AS p(idx);
                """);

            // Create index for season lookups
            migrationBuilder.Sql("""
                CREATE INDEX ix_season_percentiles_season
                ON season_percentiles (season);
                """);

            // Create unique index required for CONCURRENT refresh
            migrationBuilder.Sql("""
                CREATE UNIQUE INDEX ix_season_percentiles_unique
                ON season_percentiles (season, percentile);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP MATERIALIZED VIEW IF EXISTS season_percentiles;");
        }
    }
}
