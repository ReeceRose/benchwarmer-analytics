import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getAgeCurves } from "@/server/api/stats";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/stats/age-curves")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getAgeCurves),
      ANY: methodNotAllowed,
    },
  },
});
