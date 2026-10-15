import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getLeagueHomeAwayHistory } from "@/server/api/home-away";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/stats/home-away")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getLeagueHomeAwayHistory),
      ANY: methodNotAllowed,
    },
  },
});
