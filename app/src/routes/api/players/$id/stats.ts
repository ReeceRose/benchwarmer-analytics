import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getPlayerStats } from "@/server/api/players";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/players/$id/stats")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.team, getPlayerStats),
      ANY: methodNotAllowed,
    },
  },
});
