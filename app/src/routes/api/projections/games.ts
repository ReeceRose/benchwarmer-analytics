import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getGameProjections } from "@/server/api/projections";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/projections/games")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getGameProjections),
      ANY: methodNotAllowed,
    },
  },
});
