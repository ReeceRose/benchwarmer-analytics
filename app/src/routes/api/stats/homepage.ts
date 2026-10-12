import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getHomepage } from "@/server/api/stats";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/stats/homepage")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getHomepage),
      ANY: methodNotAllowed,
    },
  },
});
