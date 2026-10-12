import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getLiveGames } from "@/server/api/games";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/games/live")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.live, getLiveGames),
      ANY: methodNotAllowed,
    },
  },
});
