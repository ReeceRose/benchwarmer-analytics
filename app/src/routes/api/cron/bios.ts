import { createFileRoute } from "@tanstack/react-router";
import { cronHandler } from "@/server/cron";
import { syncBios } from "@/server/ingestion/steps";
import { methodNotAllowed } from "@/server/http";

// Weekly MoneyPuck player bios. Port of WeeklyBioSyncJob.
export const Route = createFileRoute("/api/cron/bios")({
  server: {
    handlers: {
      GET: cronHandler(async (db) => ({ ...(await syncBios(db)) })),
      ANY: methodNotAllowed,
    },
  },
});
