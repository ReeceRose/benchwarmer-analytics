import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getCategoryRankings } from "@/server/api/standings";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/standings/category-rankings")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.team, getCategoryRankings),
      ANY: methodNotAllowed,
    },
  },
});
