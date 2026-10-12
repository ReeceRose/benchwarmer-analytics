import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getBreakoutCandidates } from "@/server/api/stats";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/stats/breakout-candidates")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getBreakoutCandidates),
      ANY: methodNotAllowed,
    },
  },
});
