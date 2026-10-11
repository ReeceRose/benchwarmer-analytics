import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getLeaderboard } from "@/server/api/stats";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/stats/leaderboards")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.team, getLeaderboard),
      ANY: methodNotAllowed,
    },
  },
});
