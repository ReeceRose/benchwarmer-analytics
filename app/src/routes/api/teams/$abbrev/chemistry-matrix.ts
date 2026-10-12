import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getChemistryMatrix } from "@/server/api/teams";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/teams/$abbrev/chemistry-matrix")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getChemistryMatrix),
      ANY: methodNotAllowed,
    },
  },
});
