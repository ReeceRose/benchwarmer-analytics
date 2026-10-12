import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getSeasonPercentiles } from "@/server/api/stats";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/stats/season-percentiles/$season")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.team, getSeasonPercentiles),
      ANY: methodNotAllowed,
    },
  },
});
