import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getTeamSeasons } from "@/server/api/teams";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/teams/$abbrev/seasons")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getTeamSeasons),
      ANY: methodNotAllowed,
    },
  },
});
