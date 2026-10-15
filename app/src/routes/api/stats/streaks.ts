import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getStreaks } from "@/server/api/streaks";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/stats/streaks")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getStreaks),
      ANY: methodNotAllowed,
    },
  },
});
