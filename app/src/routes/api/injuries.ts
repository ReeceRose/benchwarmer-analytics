import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getLeagueInjuries } from "@/server/api/injuries";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/injuries")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getLeagueInjuries),
      ANY: methodNotAllowed,
    },
  },
});
