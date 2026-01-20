using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Benchwarmer.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddGamesTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Note: player1_position and player2_position columns are added to chemistry_pairs
            // via the AddPositionsToChemistryPairs migration which recreates the materialized view.
            // We can't use AddColumn on a materialized view.

            migrationBuilder.CreateTable(
                name: "games",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    game_id = table.Column<string>(type: "text", nullable: false),
                    season = table.Column<int>(type: "integer", nullable: false),
                    game_type = table.Column<int>(type: "integer", nullable: false),
                    game_date = table.Column<DateOnly>(type: "date", nullable: false),
                    home_team_code = table.Column<string>(type: "text", nullable: false),
                    away_team_code = table.Column<string>(type: "text", nullable: false),
                    home_score = table.Column<int>(type: "integer", nullable: false),
                    away_score = table.Column<int>(type: "integer", nullable: false),
                    game_state = table.Column<string>(type: "text", nullable: false),
                    period_type = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_games", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_games_game_date",
                table: "games",
                column: "game_date");

            migrationBuilder.CreateIndex(
                name: "IX_games_game_date_game_state",
                table: "games",
                columns: new[] { "game_date", "game_state" });

            migrationBuilder.CreateIndex(
                name: "IX_games_game_id",
                table: "games",
                column: "game_id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "games");

            // Note: position columns are managed by AddPositionsToChemistryPairs migration
        }
    }
}
