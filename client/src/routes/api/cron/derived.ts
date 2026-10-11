import { createFileRoute } from "@tanstack/react-router";
import { cronHandler } from "@/server/cron";
import { refreshViews, syncScoreStates } from "@/server/ingestion/steps";
import { methodNotAllowed } from "@/server/http";

// Full-season score-state recompute (only changed rows are written) and
// materialized view refresh.
export const Route = createFileRoute("/api/cron/derived")({
  server: {
    handlers: {
      GET: cronHandler(async (db, season) => {
        const scoreState = await syncScoreStates(db, season);
        await refreshViews(db);
        return { season, rowsWritten: { scoreState: scoreState.rowsWritten } };
      }),
      ANY: methodNotAllowed,
    },
  },
});
