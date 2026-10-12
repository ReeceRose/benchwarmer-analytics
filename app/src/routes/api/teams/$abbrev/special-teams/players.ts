import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getSpecialTeamsPlayers } from "@/server/api/teams";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/teams/$abbrev/special-teams/players")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.team, getSpecialTeamsPlayers),
      ANY: methodNotAllowed,
    },
  },
});
