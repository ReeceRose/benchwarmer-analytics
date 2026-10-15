import { createFileRoute } from "@tanstack/react-router";
import { cronHandler } from "@/server/cron";
import { syncProjections } from "@/server/ingestion/steps";
import { methodNotAllowed } from "@/server/http";

// Daily playoff odds, after the schedule cron has stored last night's results.
export const Route = createFileRoute("/api/cron/projections")({
  server: {
    handlers: {
      GET: cronHandler(async (db, season) => {
        const projections = await syncProjections(db, season);
        return { season, rowsWritten: { projections: projections.rowsWritten } };
      }),
      ANY: methodNotAllowed,
    },
  },
});
