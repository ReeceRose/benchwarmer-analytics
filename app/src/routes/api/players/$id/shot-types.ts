import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getPlayerShotTypes } from "@/server/api/shot-types";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/players/$id/shot-types")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.team, getPlayerShotTypes),
      ANY: methodNotAllowed,
    },
  },
});
