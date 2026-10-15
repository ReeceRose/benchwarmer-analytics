import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getPlayerTracking } from "@/server/api/tracking";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/players/$id/tracking")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.team, getPlayerTracking),
      ANY: methodNotAllowed,
    },
  },
});
