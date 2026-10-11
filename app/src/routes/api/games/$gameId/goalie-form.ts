import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getGoalieRecentForm } from "@/server/api/games";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/games/$gameId/goalie-form")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.team, getGoalieRecentForm),
      ANY: methodNotAllowed,
    },
  },
});
