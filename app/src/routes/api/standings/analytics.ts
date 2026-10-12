import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getStandingsAnalytics } from "@/server/api/standings";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/standings/analytics")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.team, getStandingsAnalytics),
      ANY: methodNotAllowed,
    },
  },
});
