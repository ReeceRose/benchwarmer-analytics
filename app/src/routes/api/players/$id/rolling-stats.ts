import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getPlayerRollingStats } from "@/server/api/players";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/players/$id/rolling-stats")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.team, getPlayerRollingStats),
      ANY: methodNotAllowed,
    },
  },
});
