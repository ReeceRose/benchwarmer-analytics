import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getTodaysGames } from "@/server/api/games";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/games/today")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.live, getTodaysGames),
      ANY: methodNotAllowed,
    },
  },
});
