import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getAgeDistribution } from "@/server/api/stats";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/stats/age-distribution/$age")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getAgeDistribution),
      ANY: methodNotAllowed,
    },
  },
});
