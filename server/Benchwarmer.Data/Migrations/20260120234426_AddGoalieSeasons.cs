using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Benchwarmer.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddGoalieSeasons : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "goalie_seasons",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    player_id = table.Column<int>(type: "integer", nullable: false),
                    season = table.Column<int>(type: "integer", nullable: false),
                    team = table.Column<string>(type: "text", nullable: false),
                    situation = table.Column<string>(type: "text", nullable: false),
                    is_playoffs = table.Column<bool>(type: "boolean", nullable: false),
                    games_played = table.Column<int>(type: "integer", nullable: false),
                    ice_time_seconds = table.Column<int>(type: "integer", nullable: false),
                    goals_against = table.Column<int>(type: "integer", nullable: false),
                    shots_against = table.Column<int>(type: "integer", nullable: false),
                    expected_goals_against = table.Column<decimal>(type: "numeric", nullable: true),
                    save_percentage = table.Column<decimal>(type: "numeric", nullable: true),
                    goals_against_average = table.Column<decimal>(type: "numeric", nullable: true),
                    goals_saved_above_expected = table.Column<decimal>(type: "numeric", nullable: true),
                    low_danger_shots = table.Column<int>(type: "integer", nullable: false),
                    medium_danger_shots = table.Column<int>(type: "integer", nullable: false),
                    high_danger_shots = table.Column<int>(type: "integer", nullable: false),
                    low_danger_goals = table.Column<int>(type: "integer", nullable: false),
                    medium_danger_goals = table.Column<int>(type: "integer", nullable: false),
                    high_danger_goals = table.Column<int>(type: "integer", nullable: false),
                    expected_rebounds = table.Column<decimal>(type: "numeric", nullable: true),
                    rebounds = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_goalie_seasons", x => x.id);
                    table.ForeignKey(
                        name: "FK_goalie_seasons_players_player_id",
                        column: x => x.player_id,
                        principalTable: "players",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_goalie_seasons_player_id_season_team_situation_is_playoffs",
                table: "goalie_seasons",
                columns: new[] { "player_id", "season", "team", "situation", "is_playoffs" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_goalie_seasons_season_team",
                table: "goalie_seasons",
                columns: new[] { "season", "team" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "goalie_seasons");
        }
    }
}
