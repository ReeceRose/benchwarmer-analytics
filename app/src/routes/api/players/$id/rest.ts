import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getGoalieRest } from "@/server/api/situations";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/players/$id/rest")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.team, getGoalieRest),
      ANY: methodNotAllowed,
    },
  },
});
