using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Benchwarmer.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddShots : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "shots",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    shot_id = table.Column<string>(type: "text", nullable: false),
                    game_id = table.Column<string>(type: "text", nullable: false),
                    event_id = table.Column<int>(type: "integer", nullable: false),
                    season = table.Column<int>(type: "integer", nullable: false),
                    is_playoff_game = table.Column<bool>(type: "boolean", nullable: false),
                    home_team_code = table.Column<string>(type: "text", nullable: false),
                    away_team_code = table.Column<string>(type: "text", nullable: false),
                    team = table.Column<string>(type: "text", nullable: false),
                    team_code = table.Column<string>(type: "text", nullable: false),
                    is_home_team = table.Column<bool>(type: "boolean", nullable: false),
                    home_team_won = table.Column<bool>(type: "boolean", nullable: false),
                    shooter_player_id = table.Column<int>(type: "integer", nullable: true),
                    shooter_name = table.Column<string>(type: "text", nullable: true),
                    shooter_left_right = table.Column<string>(type: "text", nullable: true),
                    shooter_position = table.Column<string>(type: "text", nullable: true),
                    shooter_jersey_number = table.Column<int>(type: "integer", nullable: true),
                    goalie_player_id = table.Column<int>(type: "integer", nullable: true),
                    goalie_name = table.Column<string>(type: "text", nullable: true),
                    last_event_player_number = table.Column<int>(type: "integer", nullable: true),
                    @event = table.Column<string>(name: "event", type: "text", nullable: false),
                    is_goal = table.Column<bool>(type: "boolean", nullable: false),
                    shot_type = table.Column<string>(type: "text", nullable: true),
                    period = table.Column<int>(type: "integer", nullable: false),
                    game_time_seconds = table.Column<int>(type: "integer", nullable: false),
                    time_left = table.Column<int>(type: "integer", nullable: true),
                    x_coord = table.Column<decimal>(type: "numeric", nullable: true),
                    y_coord = table.Column<decimal>(type: "numeric", nullable: true),
                    location = table.Column<string>(type: "text", nullable: true),
                    x_coord_adjusted = table.Column<decimal>(type: "numeric", nullable: true),
                    y_coord_adjusted = table.Column<decimal>(type: "numeric", nullable: true),
                    arena_adjusted_x_coord = table.Column<decimal>(type: "numeric", nullable: true),
                    arena_adjusted_y_coord = table.Column<decimal>(type: "numeric", nullable: true),
                    arena_adjusted_x_coord_abs = table.Column<decimal>(type: "numeric", nullable: true),
                    arena_adjusted_y_coord_abs = table.Column<decimal>(type: "numeric", nullable: true),
                    shot_distance = table.Column<decimal>(type: "numeric", nullable: true),
                    shot_angle = table.Column<decimal>(type: "numeric", nullable: true),
                    shot_angle_adjusted = table.Column<decimal>(type: "numeric", nullable: true),
                    arena_adjusted_shot_distance = table.Column<decimal>(type: "numeric", nullable: true),
                    shot_on_empty_net = table.Column<bool>(type: "boolean", nullable: false),
                    shot_rebound = table.Column<bool>(type: "boolean", nullable: false),
                    shot_rush = table.Column<bool>(type: "boolean", nullable: false),
                    off_wing = table.Column<bool>(type: "boolean", nullable: false),
                    shot_was_on_goal = table.Column<bool>(type: "boolean", nullable: false),
                    shot_play_continued = table.Column<bool>(type: "boolean", nullable: false),
                    shot_play_continued_in_zone = table.Column<bool>(type: "boolean", nullable: false),
                    shot_play_continued_outside_zone = table.Column<bool>(type: "boolean", nullable: false),
                    shot_goalie_froze = table.Column<bool>(type: "boolean", nullable: false),
                    shot_play_stopped = table.Column<bool>(type: "boolean", nullable: false),
                    shot_generated_rebound = table.Column<bool>(type: "boolean", nullable: false),
                    time_until_next_event = table.Column<decimal>(type: "numeric", nullable: true),
                    time_since_last_event = table.Column<decimal>(type: "numeric", nullable: true),
                    time_between_events = table.Column<decimal>(type: "numeric", nullable: true),
                    time_since_faceoff = table.Column<decimal>(type: "numeric", nullable: true),
                    shooter_time_on_ice = table.Column<decimal>(type: "numeric", nullable: true),
                    shooter_time_on_ice_since_faceoff = table.Column<decimal>(type: "numeric", nullable: true),
                    time_difference_since_change = table.Column<decimal>(type: "numeric", nullable: true),
                    home_team_goals = table.Column<int>(type: "integer", nullable: false),
                    away_team_goals = table.Column<int>(type: "integer", nullable: false),
                    home_team_score = table.Column<int>(type: "integer", nullable: true),
                    road_team_score = table.Column<int>(type: "integer", nullable: true),
                    home_empty_net = table.Column<bool>(type: "boolean", nullable: false),
                    away_empty_net = table.Column<bool>(type: "boolean", nullable: false),
                    game_over = table.Column<bool>(type: "boolean", nullable: true),
                    went_to_o_t = table.Column<bool>(type: "boolean", nullable: true),
                    went_to_shootout = table.Column<bool>(type: "boolean", nullable: true),
                    home_win_probability = table.Column<decimal>(type: "numeric", nullable: true),
                    home_skaters_on_ice = table.Column<int>(type: "integer", nullable: false),
                    away_skaters_on_ice = table.Column<int>(type: "integer", nullable: false),
                    shooting_team_forwards_on_ice = table.Column<int>(type: "integer", nullable: false),
                    shooting_team_defencemen_on_ice = table.Column<int>(type: "integer", nullable: false),
                    defending_team_forwards_on_ice = table.Column<int>(type: "integer", nullable: false),
                    defending_team_defencemen_on_ice = table.Column<int>(type: "integer", nullable: false),
                    shooting_team_average_time_on_ice = table.Column<decimal>(type: "numeric", nullable: true),
                    shooting_team_max_time_on_ice = table.Column<decimal>(type: "numeric", nullable: true),
                    shooting_team_min_time_on_ice = table.Column<decimal>(type: "numeric", nullable: true),
                    shooting_team_average_time_on_ice_of_forwards = table.Column<decimal>(type: "numeric", nullable: true),
                    shooting_team_max_time_on_ice_of_forwards = table.Column<decimal>(type: "numeric", nullable: true),
                    shooting_team_min_time_on_ice_of_forwards = table.Column<decimal>(type: "numeric", nullable: true),
                    shooting_team_average_time_on_ice_of_defencemen = table.Column<decimal>(type: "numeric", nullable: true),
                    shooting_team_max_time_on_ice_of_defencemen = table.Column<decimal>(type: "numeric", nullable: true),
                    shooting_team_min_time_on_ice_of_defencemen = table.Column<decimal>(type: "numeric", nullable: true),
                    shooting_team_average_time_on_ice_since_faceoff = table.Column<decimal>(type: "numeric", nullable: true),
                    shooting_team_max_time_on_ice_since_faceoff = table.Column<decimal>(type: "numeric", nullable: true),
                    shooting_team_min_time_on_ice_since_faceoff = table.Column<decimal>(type: "numeric", nullable: true),
                    shooting_team_average_time_on_ice_since_faceoff_of_forwards = table.Column<decimal>(type: "numeric", nullable: true),
                    shooting_team_max_time_on_ice_since_faceoff_of_forwards = table.Column<decimal>(type: "numeric", nullable: true),
                    shooting_team_min_time_on_ice_since_faceoff_of_forwards = table.Column<decimal>(type: "numeric", nullable: true),
                    shooting_team_average_time_on_ice_since_faceoff_of_defencemen = table.Column<decimal>(type: "numeric", nullable: true),
                    shooting_team_max_time_on_ice_since_faceoff_of_defencemen = table.Column<decimal>(type: "numeric", nullable: true),
                    shooting_team_min_time_on_ice_since_faceoff_of_defencemen = table.Column<decimal>(type: "numeric", nullable: true),
                    defending_team_average_time_on_ice = table.Column<decimal>(type: "numeric", nullable: true),
                    defending_team_max_time_on_ice = table.Column<decimal>(type: "numeric", nullable: true),
                    defending_team_min_time_on_ice = table.Column<decimal>(type: "numeric", nullable: true),
                    defending_team_average_time_on_ice_of_forwards = table.Column<decimal>(type: "numeric", nullable: true),
                    defending_team_max_time_on_ice_of_forwards = table.Column<decimal>(type: "numeric", nullable: true),
                    defending_team_min_time_on_ice_of_forwards = table.Column<decimal>(type: "numeric", nullable: true),
                    defending_team_average_time_on_ice_of_defencemen = table.Column<decimal>(type: "numeric", nullable: true),
                    defending_team_max_time_on_ice_of_defencemen = table.Column<decimal>(type: "numeric", nullable: true),
                    defending_team_min_time_on_ice_of_defencemen = table.Column<decimal>(type: "numeric", nullable: true),
                    defending_team_average_time_on_ice_since_faceoff = table.Column<decimal>(type: "numeric", nullable: true),
                    defending_team_max_time_on_ice_since_faceoff = table.Column<decimal>(type: "numeric", nullable: true),
                    defending_team_min_time_on_ice_since_faceoff = table.Column<decimal>(type: "numeric", nullable: true),
                    defending_team_average_time_on_ice_since_faceoff_of_forwards = table.Column<decimal>(type: "numeric", nullable: true),
                    defending_team_max_time_on_ice_since_faceoff_of_forwards = table.Column<decimal>(type: "numeric", nullable: true),
                    defending_team_min_time_on_ice_since_faceoff_of_forwards = table.Column<decimal>(type: "numeric", nullable: true),
                    defending_team_average_time_on_ice_since_faceoff_of_defencemen = table.Column<decimal>(type: "numeric", nullable: true),
                    defending_team_max_time_on_ice_since_faceoff_of_defencemen = table.Column<decimal>(type: "numeric", nullable: true),
                    defending_team_min_time_on_ice_since_faceoff_of_defencemen = table.Column<decimal>(type: "numeric", nullable: true),
                    away_penalty1_time_left = table.Column<decimal>(type: "numeric", nullable: true),
                    away_penalty1_length = table.Column<decimal>(type: "numeric", nullable: true),
                    home_penalty1_time_left = table.Column<decimal>(type: "numeric", nullable: true),
                    home_penalty1_length = table.Column<decimal>(type: "numeric", nullable: true),
                    penalty_length = table.Column<decimal>(type: "numeric", nullable: true),
                    last_event_x_coord = table.Column<decimal>(type: "numeric", nullable: true),
                    last_event_y_coord = table.Column<decimal>(type: "numeric", nullable: true),
                    last_event_x_coord_adjusted = table.Column<decimal>(type: "numeric", nullable: true),
                    last_event_y_coord_adjusted = table.Column<decimal>(type: "numeric", nullable: true),
                    last_event_shot_angle = table.Column<decimal>(type: "numeric", nullable: true),
                    last_event_shot_distance = table.Column<decimal>(type: "numeric", nullable: true),
                    last_event_category = table.Column<string>(type: "text", nullable: true),
                    last_event_team = table.Column<string>(type: "text", nullable: true),
                    distance_from_last_event = table.Column<decimal>(type: "numeric", nullable: true),
                    speed_from_last_event = table.Column<decimal>(type: "numeric", nullable: true),
                    average_rest_difference = table.Column<decimal>(type: "numeric", nullable: true),
                    x_goal = table.Column<decimal>(type: "numeric", nullable: true),
                    x_froze = table.Column<decimal>(type: "numeric", nullable: true),
                    x_rebound = table.Column<decimal>(type: "numeric", nullable: true),
                    x_play_continued_in_zone = table.Column<decimal>(type: "numeric", nullable: true),
                    x_play_continued_outside_zone = table.Column<decimal>(type: "numeric", nullable: true),
                    x_play_stopped = table.Column<decimal>(type: "numeric", nullable: true),
                    x_shot_was_on_goal = table.Column<decimal>(type: "numeric", nullable: true),
                    shot_goal_probability = table.Column<decimal>(type: "numeric", nullable: true),
                    shot_angle_plus_rebound = table.Column<decimal>(type: "numeric", nullable: true),
                    shot_angle_plus_rebound_speed = table.Column<decimal>(type: "numeric", nullable: true),
                    shot_angle_rebound_royal_road = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_shots", x => x.id);
                    table.ForeignKey(
                        name: "FK_shots_players_goalie_player_id",
                        column: x => x.goalie_player_id,
                        principalTable: "players",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_shots_players_shooter_player_id",
                        column: x => x.shooter_player_id,
                        principalTable: "players",
                        principalColumn: "id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_shots_game_id",
                table: "shots",
                column: "game_id");

            migrationBuilder.CreateIndex(
                name: "IX_shots_goalie_player_id",
                table: "shots",
                column: "goalie_player_id");

            migrationBuilder.CreateIndex(
                name: "IX_shots_season",
                table: "shots",
                column: "season");

            migrationBuilder.CreateIndex(
                name: "IX_shots_season_is_goal",
                table: "shots",
                columns: new[] { "season", "is_goal" });

            migrationBuilder.CreateIndex(
                name: "IX_shots_season_team_code",
                table: "shots",
                columns: new[] { "season", "team_code" });

            migrationBuilder.CreateIndex(
                name: "IX_shots_shooter_player_id",
                table: "shots",
                column: "shooter_player_id");

            migrationBuilder.CreateIndex(
                name: "IX_shots_shot_id",
                table: "shots",
                column: "shot_id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "shots");
        }
    }
}
