import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getGoalieWorkload } from "@/server/api/players";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/players/$id/workload")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.team, getGoalieWorkload),
      ANY: methodNotAllowed,
    },
  },
});
