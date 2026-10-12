import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getTeam } from "@/server/api/teams";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/teams/$abbrev/")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.static, getTeam),
      ANY: methodNotAllowed,
    },
  },
});
