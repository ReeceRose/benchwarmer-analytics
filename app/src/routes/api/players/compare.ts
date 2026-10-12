import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { comparePlayers } from "@/server/api/players";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/players/compare")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.team, comparePlayers),
      ANY: methodNotAllowed,
    },
  },
});
