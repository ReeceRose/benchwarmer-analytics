import { createFileRoute } from "@tanstack/react-router";
import { cronHandler } from "@/server/cron";
import { SEASON_DATASETS, syncSeasonDataset, syncTeamGames } from "@/server/ingestion/steps";
import { methodNotAllowed } from "@/server/http";

// MoneyPuck teams, skaters, goalies and lines (regular season + playoffs),
// then team game-by-game rows.
export const Route = createFileRoute("/api/cron/season-stats")({
  server: {
    handlers: {
      GET: cronHandler(async (db, season) => {
        const rowsWritten: Record<string, number> = {};
        for (const dataset of SEASON_DATASETS) {
          rowsWritten[dataset] = (await syncSeasonDataset(db, dataset, season)).rowsWritten;
        }
        rowsWritten.team_games = (await syncTeamGames(db, season)).rowsWritten;
        return { season, rowsWritten };
      }),
      ANY: methodNotAllowed,
    },
  },
});
