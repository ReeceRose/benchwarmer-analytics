import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getTopLines } from "@/server/api/stats";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/stats/top-lines")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.team, getTopLines),
      ANY: methodNotAllowed,
    },
  },
});
