import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getGameBoxscore } from "@/server/api/games";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/games/$gameId/boxscore")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.semiStatic, getGameBoxscore),
      ANY: methodNotAllowed,
    },
  },
});
