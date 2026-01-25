using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Benchwarmer.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPerformanceIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_skater_seasons_situation_season_is_playoffs",
                table: "skater_seasons",
                columns: new[] { "situation", "season", "is_playoffs" });

            migrationBuilder.CreateIndex(
                name: "IX_shots_goalie_player_id_season",
                table: "shots",
                columns: new[] { "goalie_player_id", "season" });

            migrationBuilder.CreateIndex(
                name: "IX_shots_shooter_player_id_season",
                table: "shots",
                columns: new[] { "shooter_player_id", "season" });

            migrationBuilder.CreateIndex(
                name: "IX_goalie_seasons_situation_season_is_playoffs",
                table: "goalie_seasons",
                columns: new[] { "situation", "season", "is_playoffs" });

            migrationBuilder.CreateIndex(
                name: "IX_games_season",
                table: "games",
                column: "season");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_skater_seasons_situation_season_is_playoffs",
                table: "skater_seasons");

            migrationBuilder.DropIndex(
                name: "IX_shots_goalie_player_id_season",
                table: "shots");

            migrationBuilder.DropIndex(
                name: "IX_shots_shooter_player_id_season",
                table: "shots");

            migrationBuilder.DropIndex(
                name: "IX_goalie_seasons_situation_season_is_playoffs",
                table: "goalie_seasons");

            migrationBuilder.DropIndex(
                name: "IX_games_season",
                table: "games");
        }
    }
}
