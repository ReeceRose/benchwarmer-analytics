import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getTeamInjuries } from "@/server/api/injuries";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/teams/$abbrev/injuries")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getTeamInjuries),
      ANY: methodNotAllowed,
    },
  },
});
