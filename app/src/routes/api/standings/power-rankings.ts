import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getPowerRankings } from "@/server/api/standings";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/standings/power-rankings")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getPowerRankings),
      ANY: methodNotAllowed,
    },
  },
});
