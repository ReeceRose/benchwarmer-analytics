import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getOutliers } from "@/server/api/stats";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/stats/outliers")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getOutliers),
      ANY: methodNotAllowed,
    },
  },
});
