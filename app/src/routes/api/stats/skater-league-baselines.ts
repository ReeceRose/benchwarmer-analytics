import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getSkaterLeagueBaselines } from "@/server/api/stats";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/stats/skater-league-baselines")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.team, getSkaterLeagueBaselines),
      ANY: methodNotAllowed,
    },
  },
});
