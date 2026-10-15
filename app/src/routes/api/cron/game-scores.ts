import { createFileRoute } from "@tanstack/react-router";
import { cronHandler } from "@/server/cron";
import { syncSkaterGames } from "@/server/ingestion/steps";
import { methodNotAllowed } from "@/server/http";

// Per-game Game Score for final games without it (yesterday's, plus any
// backlog), after the schedule cron has marked them final.
export const Route = createFileRoute("/api/cron/game-scores")({
  server: {
    handlers: {
      GET: cronHandler(async (db, season) => {
        const skaterGames = await syncSkaterGames(db, season);
        return { season, rowsWritten: { skaterGames: skaterGames.rowsWritten } };
      }),
      ANY: methodNotAllowed,
    },
  },
});
