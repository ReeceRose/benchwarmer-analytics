import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getLines } from "@/server/api/teams";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/teams/$abbrev/lines")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getLines),
      ANY: methodNotAllowed,
    },
  },
});
