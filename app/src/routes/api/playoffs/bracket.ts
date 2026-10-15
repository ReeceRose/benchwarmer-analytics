import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getPlayoffs } from "@/server/api/playoffs";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/playoffs/bracket")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.team, getPlayoffs),
      ANY: methodNotAllowed,
    },
  },
});
