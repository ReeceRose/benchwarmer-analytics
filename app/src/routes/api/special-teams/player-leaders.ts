import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getPlayerLeaders } from "@/server/api/special-teams";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/special-teams/player-leaders")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getPlayerLeaders),
      ANY: methodNotAllowed,
    },
  },
});
