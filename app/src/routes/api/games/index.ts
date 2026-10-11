import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getGamesByDate } from "@/server/api/games";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/games/")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.semiStatic, getGamesByDate),
      ANY: methodNotAllowed,
    },
  },
});
