import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getSpecialTeamsTrend } from "@/server/api/teams";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/teams/$abbrev/special-teams/trend")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getSpecialTeamsTrend),
      ANY: methodNotAllowed,
    },
  },
});
