import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getGameShots } from "@/server/api/games";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/games/$gameId/shots")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.static, getGameShots),
      ANY: methodNotAllowed,
    },
  },
});
