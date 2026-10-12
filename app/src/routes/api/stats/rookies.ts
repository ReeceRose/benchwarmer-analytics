import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getRookies } from "@/server/api/stats";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/stats/rookies")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getRookies),
      ANY: methodNotAllowed,
    },
  },
});
