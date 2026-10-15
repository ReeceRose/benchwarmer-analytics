import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getTravel } from "@/server/api/season-race";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/standings/travel")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getTravel),
      ANY: methodNotAllowed,
    },
  },
});
