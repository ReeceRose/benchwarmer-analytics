using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Benchwarmer.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ingestion_logs",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    dataset = table.Column<string>(type: "text", nullable: false),
                    season = table.Column<int>(type: "integer", nullable: true),
                    started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    records_processed = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    error_message = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ingestion_logs", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "players",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "text", nullable: false),
                    first_name = table.Column<string>(type: "text", nullable: true),
                    last_name = table.Column<string>(type: "text", nullable: true),
                    position = table.Column<string>(type: "text", nullable: true),
                    current_team_abbreviation = table.Column<string>(type: "text", nullable: true),
                    headshot_url = table.Column<string>(type: "text", nullable: true),
                    birth_date = table.Column<DateOnly>(type: "date", nullable: true),
                    height_inches = table.Column<int>(type: "integer", nullable: true),
                    weight_lbs = table.Column<int>(type: "integer", nullable: true),
                    shoots = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_players", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "teams",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    abbreviation = table.Column<string>(type: "text", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    division = table.Column<string>(type: "text", nullable: true),
                    conference = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_teams", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "line_combinations",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    season = table.Column<int>(type: "integer", nullable: false),
                    team = table.Column<string>(type: "text", nullable: false),
                    situation = table.Column<string>(type: "text", nullable: false),
                    player1_id = table.Column<int>(type: "integer", nullable: false),
                    player2_id = table.Column<int>(type: "integer", nullable: false),
                    player3_id = table.Column<int>(type: "integer", nullable: true),
                    ice_time_seconds = table.Column<int>(type: "integer", nullable: false),
                    games_played = table.Column<int>(type: "integer", nullable: false),
                    goals_for = table.Column<int>(type: "integer", nullable: false),
                    goals_against = table.Column<int>(type: "integer", nullable: false),
                    expected_goals_for = table.Column<decimal>(type: "numeric", nullable: true),
                    expected_goals_against = table.Column<decimal>(type: "numeric", nullable: true),
                    expected_goals_pct = table.Column<decimal>(type: "numeric", nullable: true),
                    corsi_for = table.Column<int>(type: "integer", nullable: false),
                    corsi_against = table.Column<int>(type: "integer", nullable: false),
                    corsi_pct = table.Column<decimal>(type: "numeric", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_line_combinations", x => x.id);
                    table.ForeignKey(
                        name: "FK_line_combinations_players_player1_id",
                        column: x => x.player1_id,
                        principalTable: "players",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_line_combinations_players_player2_id",
                        column: x => x.player2_id,
                        principalTable: "players",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_line_combinations_players_player3_id",
                        column: x => x.player3_id,
                        principalTable: "players",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "skater_seasons",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    player_id = table.Column<int>(type: "integer", nullable: false),
                    season = table.Column<int>(type: "integer", nullable: false),
                    team = table.Column<string>(type: "text", nullable: false),
                    situation = table.Column<string>(type: "text", nullable: false),
                    games_played = table.Column<int>(type: "integer", nullable: false),
                    ice_time_seconds = table.Column<int>(type: "integer", nullable: false),
                    goals = table.Column<int>(type: "integer", nullable: false),
                    assists = table.Column<int>(type: "integer", nullable: false),
                    shots = table.Column<int>(type: "integer", nullable: false),
                    expected_goals = table.Column<decimal>(type: "numeric", nullable: true),
                    expected_goals_per60 = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_shooting_pct = table.Column<decimal>(type: "numeric", nullable: true),
                    on_ice_save_pct = table.Column<decimal>(type: "numeric", nullable: true),
                    corsi_for_pct = table.Column<decimal>(type: "numeric", nullable: true),
                    fenwick_for_pct = table.Column<decimal>(type: "numeric", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_skater_seasons", x => x.id);
                    table.ForeignKey(
                        name: "FK_skater_seasons_players_player_id",
                        column: x => x.player_id,
                        principalTable: "players",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ingestion_logs_dataset_season",
                table: "ingestion_logs",
                columns: new[] { "dataset", "season" });

            migrationBuilder.CreateIndex(
                name: "IX_line_combinations_player1_id",
                table: "line_combinations",
                column: "player1_id");

            migrationBuilder.CreateIndex(
                name: "IX_line_combinations_player2_id",
                table: "line_combinations",
                column: "player2_id");

            migrationBuilder.CreateIndex(
                name: "IX_line_combinations_player3_id",
                table: "line_combinations",
                column: "player3_id");

            migrationBuilder.CreateIndex(
                name: "IX_line_combinations_season_team",
                table: "line_combinations",
                columns: new[] { "season", "team" });

            migrationBuilder.CreateIndex(
                name: "IX_line_combinations_season_team_situation_player1_id_player2_~",
                table: "line_combinations",
                columns: new[] { "season", "team", "situation", "player1_id", "player2_id", "player3_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_players_current_team_abbreviation",
                table: "players",
                column: "current_team_abbreviation");

            migrationBuilder.CreateIndex(
                name: "IX_players_name",
                table: "players",
                column: "name");

            migrationBuilder.CreateIndex(
                name: "IX_skater_seasons_player_id_season_team_situation",
                table: "skater_seasons",
                columns: new[] { "player_id", "season", "team", "situation" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_skater_seasons_season_team",
                table: "skater_seasons",
                columns: new[] { "season", "team" });

            migrationBuilder.CreateIndex(
                name: "IX_teams_abbreviation",
                table: "teams",
                column: "abbreviation",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ingestion_logs");

            migrationBuilder.DropTable(
                name: "line_combinations");

            migrationBuilder.DropTable(
                name: "skater_seasons");

            migrationBuilder.DropTable(
                name: "teams");

            migrationBuilder.DropTable(
                name: "players");
        }
    }
}
