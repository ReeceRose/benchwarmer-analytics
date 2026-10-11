import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getTeamRankings } from "@/server/api/special-teams";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/special-teams/team-rankings")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.team, getTeamRankings),
      ANY: methodNotAllowed,
    },
  },
});
