import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getGoalieLeagueBaselines } from "@/server/api/stats";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/stats/goalie-league-baselines")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getGoalieLeagueBaselines),
      ANY: methodNotAllowed,
    },
  },
});
