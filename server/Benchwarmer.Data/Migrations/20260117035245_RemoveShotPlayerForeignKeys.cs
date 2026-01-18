using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Benchwarmer.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemoveShotPlayerForeignKeys : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_shots_players_goalie_player_id",
                table: "shots");

            migrationBuilder.DropForeignKey(
                name: "FK_shots_players_shooter_player_id",
                table: "shots");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddForeignKey(
                name: "FK_shots_players_goalie_player_id",
                table: "shots",
                column: "goalie_player_id",
                principalTable: "players",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_shots_players_shooter_player_id",
                table: "shots",
                column: "shooter_player_id",
                principalTable: "players",
                principalColumn: "id");
        }
    }
}
