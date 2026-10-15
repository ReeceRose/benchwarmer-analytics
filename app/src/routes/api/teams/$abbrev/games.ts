import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getTeamGameLog } from "@/server/api/teams";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/teams/$abbrev/games")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getTeamGameLog),
      ANY: methodNotAllowed,
    },
  },
});
