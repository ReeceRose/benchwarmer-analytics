using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Benchwarmer.Data.Migrations
{
    /// <inheritdoc />
    public partial class UpdateSkaterSeasonUniqueIndexWithIsPlayoffs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_skater_seasons_player_id_season_team_situation",
                table: "skater_seasons");

            migrationBuilder.CreateIndex(
                name: "IX_skater_seasons_player_id_season_team_situation_is_playoffs",
                table: "skater_seasons",
                columns: new[] { "player_id", "season", "team", "situation", "is_playoffs" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_skater_seasons_player_id_season_team_situation_is_playoffs",
                table: "skater_seasons");

            migrationBuilder.CreateIndex(
                name: "IX_skater_seasons_player_id_season_team_situation",
                table: "skater_seasons",
                columns: new[] { "player_id", "season", "team", "situation" },
                unique: true);
        }
    }
}
