using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Benchwarmer.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTeamSeasons : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddUniqueConstraint(
                name: "AK_teams_abbreviation",
                table: "teams",
                column: "abbreviation");

            migrationBuilder.CreateTable(
                name: "team_seasons",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    team_abbreviation = table.Column<string>(type: "text", nullable: false),
                    season = table.Column<int>(type: "integer", nullable: false),
                    situation = table.Column<string>(type: "text", nullable: false),
                    games_played = table.Column<int>(type: "integer", nullable: false),
                    ice_time = table.Column<decimal>(type: "numeric", nullable: false),
                    x_goals_percentage = table.Column<decimal>(type: "numeric", nullable: true),
                    corsi_percentage = table.Column<decimal>(type: "numeric", nullable: true),
                    fenwick_percentage = table.Column<decimal>(type: "numeric", nullable: true),
                    x_on_goal_for = table.Column<decimal>(type: "numeric", nullable: false),
                    x_goals_for = table.Column<decimal>(type: "numeric", nullable: false),
                    x_rebounds_for = table.Column<decimal>(type: "numeric", nullable: false),
                    x_freeze_for = table.Column<decimal>(type: "numeric", nullable: false),
                    x_play_stopped_for = table.Column<decimal>(type: "numeric", nullable: false),
                    x_play_continued_in_zone_for = table.Column<decimal>(type: "numeric", nullable: false),
                    x_play_continued_outside_zone_for = table.Column<decimal>(type: "numeric", nullable: false),
                    flurry_adjusted_x_goals_for = table.Column<decimal>(type: "numeric", nullable: false),
                    score_venue_adjusted_x_goals_for = table.Column<decimal>(type: "numeric", nullable: false),
                    flurry_score_venue_adjusted_x_goals_for = table.Column<decimal>(type: "numeric", nullable: false),
                    shots_on_goal_for = table.Column<int>(type: "integer", nullable: false),
                    missed_shots_for = table.Column<int>(type: "integer", nullable: false),
                    blocked_shot_attempts_for = table.Column<int>(type: "integer", nullable: false),
                    shot_attempts_for = table.Column<int>(type: "integer", nullable: false),
                    goals_for = table.Column<int>(type: "integer", nullable: false),
                    rebounds_for = table.Column<int>(type: "integer", nullable: false),
                    rebound_goals_for = table.Column<int>(type: "integer", nullable: false),
                    freeze_for = table.Column<int>(type: "integer", nullable: false),
                    play_stopped_for = table.Column<int>(type: "integer", nullable: false),
                    play_continued_in_zone_for = table.Column<int>(type: "integer", nullable: false),
                    play_continued_outside_zone_for = table.Column<int>(type: "integer", nullable: false),
                    saved_shots_on_goal_for = table.Column<int>(type: "integer", nullable: false),
                    saved_unblocked_shot_attempts_for = table.Column<int>(type: "integer", nullable: false),
                    penalties_for = table.Column<int>(type: "integer", nullable: false),
                    penalty_minutes_for = table.Column<int>(type: "integer", nullable: false),
                    face_offs_won_for = table.Column<int>(type: "integer", nullable: false),
                    hits_for = table.Column<int>(type: "integer", nullable: false),
                    takeaways_for = table.Column<int>(type: "integer", nullable: false),
                    giveaways_for = table.Column<int>(type: "integer", nullable: false),
                    low_danger_shots_for = table.Column<int>(type: "integer", nullable: false),
                    medium_danger_shots_for = table.Column<int>(type: "integer", nullable: false),
                    high_danger_shots_for = table.Column<int>(type: "integer", nullable: false),
                    low_danger_x_goals_for = table.Column<decimal>(type: "numeric", nullable: false),
                    medium_danger_x_goals_for = table.Column<decimal>(type: "numeric", nullable: false),
                    high_danger_x_goals_for = table.Column<decimal>(type: "numeric", nullable: false),
                    low_danger_goals_for = table.Column<int>(type: "integer", nullable: false),
                    medium_danger_goals_for = table.Column<int>(type: "integer", nullable: false),
                    high_danger_goals_for = table.Column<int>(type: "integer", nullable: false),
                    score_adjusted_shot_attempts_for = table.Column<decimal>(type: "numeric", nullable: false),
                    unblocked_shot_attempts_for = table.Column<decimal>(type: "numeric", nullable: false),
                    score_adjusted_unblocked_shot_attempts_for = table.Column<decimal>(type: "numeric", nullable: false),
                    d_zone_giveaways_for = table.Column<int>(type: "integer", nullable: false),
                    x_goals_from_x_rebounds_of_shots_for = table.Column<decimal>(type: "numeric", nullable: false),
                    x_goals_from_actual_rebounds_of_shots_for = table.Column<decimal>(type: "numeric", nullable: false),
                    rebound_x_goals_for = table.Column<decimal>(type: "numeric", nullable: false),
                    total_shot_credit_for = table.Column<decimal>(type: "numeric", nullable: false),
                    score_adjusted_total_shot_credit_for = table.Column<decimal>(type: "numeric", nullable: false),
                    score_flurry_adjusted_total_shot_credit_for = table.Column<decimal>(type: "numeric", nullable: false),
                    x_on_goal_against = table.Column<decimal>(type: "numeric", nullable: false),
                    x_goals_against = table.Column<decimal>(type: "numeric", nullable: false),
                    x_rebounds_against = table.Column<decimal>(type: "numeric", nullable: false),
                    x_freeze_against = table.Column<decimal>(type: "numeric", nullable: false),
                    x_play_stopped_against = table.Column<decimal>(type: "numeric", nullable: false),
                    x_play_continued_in_zone_against = table.Column<decimal>(type: "numeric", nullable: false),
                    x_play_continued_outside_zone_against = table.Column<decimal>(type: "numeric", nullable: false),
                    flurry_adjusted_x_goals_against = table.Column<decimal>(type: "numeric", nullable: false),
                    score_venue_adjusted_x_goals_against = table.Column<decimal>(type: "numeric", nullable: false),
                    flurry_score_venue_adjusted_x_goals_against = table.Column<decimal>(type: "numeric", nullable: false),
                    shots_on_goal_against = table.Column<int>(type: "integer", nullable: false),
                    missed_shots_against = table.Column<int>(type: "integer", nullable: false),
                    blocked_shot_attempts_against = table.Column<int>(type: "integer", nullable: false),
                    shot_attempts_against = table.Column<int>(type: "integer", nullable: false),
                    goals_against = table.Column<int>(type: "integer", nullable: false),
                    rebounds_against = table.Column<int>(type: "integer", nullable: false),
                    rebound_goals_against = table.Column<int>(type: "integer", nullable: false),
                    freeze_against = table.Column<int>(type: "integer", nullable: false),
                    play_stopped_against = table.Column<int>(type: "integer", nullable: false),
                    play_continued_in_zone_against = table.Column<int>(type: "integer", nullable: false),
                    play_continued_outside_zone_against = table.Column<int>(type: "integer", nullable: false),
                    saved_shots_on_goal_against = table.Column<int>(type: "integer", nullable: false),
                    saved_unblocked_shot_attempts_against = table.Column<int>(type: "integer", nullable: false),
                    penalties_against = table.Column<int>(type: "integer", nullable: false),
                    penalty_minutes_against = table.Column<int>(type: "integer", nullable: false),
                    face_offs_won_against = table.Column<int>(type: "integer", nullable: false),
                    hits_against = table.Column<int>(type: "integer", nullable: false),
                    takeaways_against = table.Column<int>(type: "integer", nullable: false),
                    giveaways_against = table.Column<int>(type: "integer", nullable: false),
                    low_danger_shots_against = table.Column<int>(type: "integer", nullable: false),
                    medium_danger_shots_against = table.Column<int>(type: "integer", nullable: false),
                    high_danger_shots_against = table.Column<int>(type: "integer", nullable: false),
                    low_danger_x_goals_against = table.Column<decimal>(type: "numeric", nullable: false),
                    medium_danger_x_goals_against = table.Column<decimal>(type: "numeric", nullable: false),
                    high_danger_x_goals_against = table.Column<decimal>(type: "numeric", nullable: false),
                    low_danger_goals_against = table.Column<int>(type: "integer", nullable: false),
                    medium_danger_goals_against = table.Column<int>(type: "integer", nullable: false),
                    high_danger_goals_against = table.Column<int>(type: "integer", nullable: false),
                    score_adjusted_shot_attempts_against = table.Column<decimal>(type: "numeric", nullable: false),
                    unblocked_shot_attempts_against = table.Column<decimal>(type: "numeric", nullable: false),
                    score_adjusted_unblocked_shot_attempts_against = table.Column<decimal>(type: "numeric", nullable: false),
                    d_zone_giveaways_against = table.Column<int>(type: "integer", nullable: false),
                    x_goals_from_x_rebounds_of_shots_against = table.Column<decimal>(type: "numeric", nullable: false),
                    x_goals_from_actual_rebounds_of_shots_against = table.Column<decimal>(type: "numeric", nullable: false),
                    rebound_x_goals_against = table.Column<decimal>(type: "numeric", nullable: false),
                    total_shot_credit_against = table.Column<decimal>(type: "numeric", nullable: false),
                    score_adjusted_total_shot_credit_against = table.Column<decimal>(type: "numeric", nullable: false),
                    score_flurry_adjusted_total_shot_credit_against = table.Column<decimal>(type: "numeric", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_team_seasons", x => x.id);
                    table.ForeignKey(
                        name: "FK_team_seasons_teams_team_abbreviation",
                        column: x => x.team_abbreviation,
                        principalTable: "teams",
                        principalColumn: "abbreviation",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_team_seasons_season",
                table: "team_seasons",
                column: "season");

            migrationBuilder.CreateIndex(
                name: "IX_team_seasons_team_abbreviation_season_situation",
                table: "team_seasons",
                columns: new[] { "team_abbreviation", "season", "situation" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "team_seasons");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_teams_abbreviation",
                table: "teams");
        }
    }
}
