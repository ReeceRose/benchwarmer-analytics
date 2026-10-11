import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getYesterdaysGames } from "@/server/api/games";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/games/yesterday")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.semiStatic, getYesterdaysGames),
      ANY: methodNotAllowed,
    },
  },
});
