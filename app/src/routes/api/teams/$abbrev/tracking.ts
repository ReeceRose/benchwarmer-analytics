import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getTeamTracking } from "@/server/api/tracking";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/teams/$abbrev/tracking")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.team, getTeamTracking),
      ANY: methodNotAllowed,
    },
  },
});
