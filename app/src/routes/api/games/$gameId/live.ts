import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getGameLive } from "@/server/api/game-live";
import { methodNotAllowed } from "@/server/http";

// The handler sets its own Cache-Control (live vs. final), so the tier here is unused.
export const Route = createFileRoute("/api/games/$gameId/live")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.live, getGameLive),
      ANY: methodNotAllowed,
    },
  },
});
