using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Benchwarmer.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddGameScoreStateTime : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "game_score_state_times",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    game_id = table.Column<string>(type: "text", nullable: false),
                    team_abbreviation = table.Column<string>(type: "text", nullable: false),
                    season = table.Column<int>(type: "integer", nullable: false),
                    is_playoffs = table.Column<bool>(type: "boolean", nullable: false),
                    leading_seconds = table.Column<int>(type: "integer", nullable: false),
                    trailing_seconds = table.Column<int>(type: "integer", nullable: false),
                    tied_seconds = table.Column<int>(type: "integer", nullable: false),
                    calculated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_game_score_state_times", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_game_score_state_times_game_id_team_abbreviation",
                table: "game_score_state_times",
                columns: new[] { "game_id", "team_abbreviation" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_game_score_state_times_team_abbreviation_season_is_playoffs",
                table: "game_score_state_times",
                columns: new[] { "team_abbreviation", "season", "is_playoffs" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "game_score_state_times");
        }
    }
}
