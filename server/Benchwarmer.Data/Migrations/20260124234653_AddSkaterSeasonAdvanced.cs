using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Benchwarmer.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSkaterSeasonAdvanced : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "skater_season_advanced",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    player_id = table.Column<int>(type: "integer", nullable: false),
                    season = table.Column<int>(type: "integer", nullable: false),
                    team = table.Column<string>(type: "text", nullable: false),
                    situation = table.Column<string>(type: "text", nullable: false),
                    is_playoffs = table.Column<bool>(type: "boolean", nullable: false),
                    on_ice_goals_for = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_shots_on_goal_for = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_goals_against = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_shots_on_goal_against = table.Column<decimal>(type: "numeric", nullable: true),
                    shifts = table.Column<decimal>(type: "numeric", nullable: true),
                    game_score = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_x_goals_percentage = table.Column<decimal>(type: "numeric", nullable: true),
                    off_ice_x_goals_percentage = table.Column<decimal>(type: "numeric", nullable: true),
                    off_ice_corsi_percentage = table.Column<decimal>(type: "numeric", nullable: true),
                    off_ice_fenwick_percentage = table.Column<decimal>(type: "numeric", nullable: true),
                    ice_time_rank = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_x_on_goal = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_x_rebounds = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_x_freeze = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_x_play_stopped = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_x_play_continued_in_zone = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_x_play_continued_outside_zone = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_flurry_adjustedx_goals = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_score_venue_adjustedx_goals = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_flurry_score_venue_adjustedx_goals = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_missed_shots = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_blocked_shot_attempts = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_shot_attempts = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_points = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_rebounds = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_rebound_goals = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_freeze = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_play_stopped = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_play_continued_in_zone = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_play_continued_outside_zone = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_saved_shots_on_goal = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_saved_unblocked_shot_attempts = table.Column<decimal>(type: "numeric", nullable: true),
                    penalties = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_penality_minutes = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_face_offs_won = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_hits = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_takeaways = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_giveaways = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_low_danger_shots = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_medium_danger_shots = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_high_danger_shots = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_low_dangerx_goals = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_medium_dangerx_goals = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_high_dangerx_goals = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_low_danger_goals = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_medium_danger_goals = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_high_danger_goals = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_score_adjusted_shots_attempts = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_unblocked_shot_attempts = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_score_adjusted_unblocked_shot_attempts = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_d_zone_giveaways = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_x_goals_fromx_rebounds_of_shots = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_x_goals_from_actual_rebounds_of_shots = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_reboundx_goals = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_x_goals_with_earned_rebounds = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_x_goals_with_earned_rebounds_score_adjusted = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_x_goals_with_earned_rebounds_score_flurry_adjusted = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_shifts = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_o_zone_shift_starts = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_d_zone_shift_starts = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_neutral_zone_shift_starts = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_fly_shift_starts = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_o_zone_shift_ends = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_d_zone_shift_ends = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_neutral_zone_shift_ends = table.Column<decimal>(type: "numeric", nullable: true),
                    i_f_fly_shift_ends = table.Column<decimal>(type: "numeric", nullable: true),
                    faceoffs_won = table.Column<decimal>(type: "numeric", nullable: true),
                    faceoffs_lost = table.Column<decimal>(type: "numeric", nullable: true),
                    time_on_bench = table.Column<decimal>(type: "numeric", nullable: true),
                    penality_minutes = table.Column<decimal>(type: "numeric", nullable: true),
                    penality_minutes_drawn = table.Column<decimal>(type: "numeric", nullable: true),
                    penalties_drawn = table.Column<decimal>(type: "numeric", nullable: true),
                    shots_blocked_by_player = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_f_x_on_goal = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_f_x_goals = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_f_flurry_adjustedx_goals = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_f_score_venue_adjustedx_goals = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_f_flurry_score_venue_adjustedx_goals = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_f_missed_shots = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_f_blocked_shot_attempts = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_f_shot_attempts = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_f_rebounds = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_f_rebound_goals = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_f_low_danger_shots = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_f_medium_danger_shots = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_f_high_danger_shots = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_f_low_dangerx_goals = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_f_medium_dangerx_goals = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_f_high_dangerx_goals = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_f_low_danger_goals = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_f_medium_danger_goals = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_f_high_danger_goals = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_f_score_adjusted_shots_attempts = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_f_unblocked_shot_attempts = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_f_score_adjusted_unblocked_shot_attempts = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_f_x_goals_fromx_rebounds_of_shots = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_f_x_goals_from_actual_rebounds_of_shots = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_f_reboundx_goals = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_f_x_goals_with_earned_rebounds = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_f_x_goals_with_earned_rebounds_score_adjusted = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_f_x_goals_with_earned_rebounds_score_flurry_adjusted = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_a_x_on_goal = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_a_x_goals = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_a_flurry_adjustedx_goals = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_a_score_venue_adjustedx_goals = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_a_flurry_score_venue_adjustedx_goals = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_a_missed_shots = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_a_blocked_shot_attempts = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_a_shot_attempts = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_a_rebounds = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_a_rebound_goals = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_a_low_danger_shots = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_a_medium_danger_shots = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_a_high_danger_shots = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_a_low_dangerx_goals = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_a_medium_dangerx_goals = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_a_high_dangerx_goals = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_a_low_danger_goals = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_a_medium_danger_goals = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_a_high_danger_goals = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_a_score_adjusted_shots_attempts = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_a_unblocked_shot_attempts = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_a_score_adjusted_unblocked_shot_attempts = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_a_x_goals_fromx_rebounds_of_shots = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_a_x_goals_from_actual_rebounds_of_shots = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_a_reboundx_goals = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_a_x_goals_with_earned_rebounds = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_a_x_goals_with_earned_rebounds_score_adjusted = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_a_x_goals_with_earned_rebounds_score_flurry_adjusted = table.Column<decimal>(type: "numeric", nullable: true),
                    off_ice_f_x_goals = table.Column<decimal>(type: "numeric", nullable: true),
                    off_ice_a_x_goals = table.Column<decimal>(type: "numeric", nullable: true),
                    off_ice_f_shot_attempts = table.Column<decimal>(type: "numeric", nullable: true),
                    off_ice_a_shot_attempts = table.Column<decimal>(type: "numeric", nullable: true),
                    x_goals_for_after_shifts = table.Column<decimal>(type: "numeric", nullable: true),
                    x_goals_against_after_shifts = table.Column<decimal>(type: "numeric", nullable: true),
                    corsi_for_after_shifts = table.Column<decimal>(type: "numeric", nullable: true),
                    corsi_against_after_shifts = table.Column<decimal>(type: "numeric", nullable: true),
                    fenwick_for_after_shifts = table.Column<decimal>(type: "numeric", nullable: true),
                    fenwick_against_after_shifts = table.Column<decimal>(type: "numeric", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_skater_season_advanced", x => x.id);
                    table.ForeignKey(
                        name: "FK_skater_season_advanced_players_player_id",
                        column: x => x.player_id,
                        principalTable: "players",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_skater_season_advanced_player_id_season_team_situation_is_p~",
                table: "skater_season_advanced",
                columns: new[] { "player_id", "season", "team", "situation", "is_playoffs" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_skater_season_advanced_season_team",
                table: "skater_season_advanced",
                columns: new[] { "season", "team" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "skater_season_advanced");
        }
    }
}
