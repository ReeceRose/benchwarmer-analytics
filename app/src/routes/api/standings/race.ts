import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getStandingsRace } from "@/server/api/season-race";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/standings/race")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getStandingsRace),
      ANY: methodNotAllowed,
    },
  },
});
