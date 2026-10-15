import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getTrackingLeaders } from "@/server/api/tracking";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/tracking/leaders")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.team, getTrackingLeaders),
      ANY: methodNotAllowed,
    },
  },
});
