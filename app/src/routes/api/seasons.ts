import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getSeasons } from "@/server/api/teams";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/seasons")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.semiStatic, getSeasons),
      ANY: methodNotAllowed,
    },
  },
});
