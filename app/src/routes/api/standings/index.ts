import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getOfficialStandings } from "@/server/api/standings";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/standings/")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.team, getOfficialStandings),
      ANY: methodNotAllowed,
    },
  },
});
