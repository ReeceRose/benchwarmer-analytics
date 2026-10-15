import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getTeamHomeAwayHistory } from "@/server/api/home-away";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/teams/$abbrev/home-away-history")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getTeamHomeAwayHistory),
      ANY: methodNotAllowed,
    },
  },
});
