import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getTeams } from "@/server/api/teams";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/teams/")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.static, getTeams),
      ANY: methodNotAllowed,
    },
  },
});
