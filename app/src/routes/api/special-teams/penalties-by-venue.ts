import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getPenaltiesByVenue } from "@/server/api/home-away";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/special-teams/penalties-by-venue")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getPenaltiesByVenue),
      ANY: methodNotAllowed,
    },
  },
});
