import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getPenaltyStats } from "@/server/api/special-teams";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/special-teams/penalty-stats")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getPenaltyStats),
      ANY: methodNotAllowed,
    },
  },
});
