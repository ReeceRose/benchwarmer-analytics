import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getTeamHomeAway } from "@/server/api/home-away";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/teams/$abbrev/home-away")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getTeamHomeAway),
      ANY: methodNotAllowed,
    },
  },
});
