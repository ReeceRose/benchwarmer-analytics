// Tracking data for a goal never changes once the NHL publishes it.
import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getGoalReplay } from "@/server/api/goal-replay";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/games/$gameId/goals/$eventId/replay")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.static, getGoalReplay),
      ANY: methodNotAllowed,
    },
  },
});
