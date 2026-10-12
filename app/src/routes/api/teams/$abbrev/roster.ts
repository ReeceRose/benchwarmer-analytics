import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getRoster } from "@/server/api/teams";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/teams/$abbrev/roster")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.team, getRoster),
      ANY: methodNotAllowed,
    },
  },
});
