import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getSpecialTeams } from "@/server/api/teams";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/teams/$abbrev/special-teams/")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getSpecialTeams),
      ANY: methodNotAllowed,
    },
  },
});
