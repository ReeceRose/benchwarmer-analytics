import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getShotsAgainst } from "@/server/api/shots";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/teams/$abbrev/shots/against")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getShotsAgainst),
      ANY: methodNotAllowed,
    },
  },
});
