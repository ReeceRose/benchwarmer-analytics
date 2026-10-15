import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getTeamShotTypes } from "@/server/api/shot-types";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/teams/$abbrev/shot-types")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.team, getTeamShotTypes),
      ANY: methodNotAllowed,
    },
  },
});
