import { createFileRoute } from "@tanstack/react-router";
import { cronHandler } from "@/server/cron";
import { syncScoreStates, syncShots } from "@/server/ingestion/steps";
import { methodNotAllowed } from "@/server/http";

// Incremental shots (new games + the last few days), then score-state for the
// games touched, so it doesn't depend on the derived cron running afterwards.
export const Route = createFileRoute("/api/cron/shots")({
  server: {
    handlers: {
      GET: cronHandler(async (db, season) => {
        const shots = await syncShots(db, season, { incremental: true, recentDays: 3 });
        const gameIds = [...shots.gameIds];
        const scoreState = gameIds.length > 0 ? await syncScoreStates(db, season, gameIds) : { rowsWritten: 0 };
        return { season, games: gameIds.length, rowsWritten: { shots: shots.rowsWritten, scoreState: scoreState.rowsWritten } };
      }),
      ANY: methodNotAllowed,
    },
  },
});
