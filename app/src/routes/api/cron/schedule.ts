import { createFileRoute } from "@tanstack/react-router";
import { cronHandler } from "@/server/cron";
import { syncRecentGames } from "@/server/ingestion/steps";
import { methodNotAllowed } from "@/server/http";

// NHL schedule/scores for yesterday and today (ET).
export const Route = createFileRoute("/api/cron/schedule")({
  server: {
    handlers: {
      GET: cronHandler(async (db) => ({ ...(await syncRecentGames(db)) })),
      ANY: methodNotAllowed,
    },
  },
});
