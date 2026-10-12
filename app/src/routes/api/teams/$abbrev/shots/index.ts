import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getTeamShots } from "@/server/api/shots";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/teams/$abbrev/shots/")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getTeamShots),
      ANY: methodNotAllowed,
    },
  },
});
