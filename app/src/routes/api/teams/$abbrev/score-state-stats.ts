import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getScoreStateStats } from "@/server/api/teams";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/teams/$abbrev/score-state-stats")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getScoreStateStats),
      ANY: methodNotAllowed,
    },
  },
});
