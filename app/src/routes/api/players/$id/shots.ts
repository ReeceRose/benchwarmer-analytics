import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getPlayerShots } from "@/server/api/players";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/players/$id/shots")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.team, getPlayerShots),
      ANY: methodNotAllowed,
    },
  },
});
