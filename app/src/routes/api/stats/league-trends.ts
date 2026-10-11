import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getLeagueTrends } from "@/server/api/stats";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/stats/league-trends")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.team, getLeagueTrends),
      ANY: methodNotAllowed,
    },
  },
});
