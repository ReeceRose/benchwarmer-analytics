using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Benchwarmer.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTeamSeasonIsPlayoffs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_team_seasons_team_abbreviation_season_situation",
                table: "team_seasons");

            migrationBuilder.AddColumn<bool>(
                name: "is_playoffs",
                table: "team_seasons",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_team_seasons_team_abbreviation_season_situation_is_playoffs",
                table: "team_seasons",
                columns: new[] { "team_abbreviation", "season", "situation", "is_playoffs" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_team_seasons_team_abbreviation_season_situation_is_playoffs",
                table: "team_seasons");

            migrationBuilder.DropColumn(
                name: "is_playoffs",
                table: "team_seasons");

            migrationBuilder.CreateIndex(
                name: "IX_team_seasons_team_abbreviation_season_situation",
                table: "team_seasons",
                columns: new[] { "team_abbreviation", "season", "situation" },
                unique: true);
        }
    }
}
