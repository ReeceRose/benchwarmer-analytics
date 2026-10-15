import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getTeamSituations } from "@/server/api/situations";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/teams/$abbrev/situations")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.team, getTeamSituations),
      ANY: methodNotAllowed,
    },
  },
});
