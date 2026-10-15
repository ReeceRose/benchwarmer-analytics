import { createFileRoute } from "@tanstack/react-router";
import { cronHandler } from "@/server/cron";
import { syncNhlRecords } from "@/server/ingestion/steps";
import { methodNotAllowed } from "@/server/http";

// Weekly NHL records: franchise history, head-to-head, draft picks, careers.
export const Route = createFileRoute("/api/cron/history")({
  server: {
    handlers: {
      GET: cronHandler(async (db) => ({ ...(await syncNhlRecords(db)) })),
      ANY: methodNotAllowed,
    },
  },
});
