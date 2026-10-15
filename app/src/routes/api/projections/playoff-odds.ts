import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getPlayoffOdds } from "@/server/api/projections";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/projections/playoff-odds")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getPlayoffOdds),
      ANY: methodNotAllowed,
    },
  },
});
