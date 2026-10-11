import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getGame } from "@/server/api/games";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/games/$gameId/")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.live, getGame),
      ANY: methodNotAllowed,
    },
  },
});
