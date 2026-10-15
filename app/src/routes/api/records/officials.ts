import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getOfficials } from "@/server/api/records";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/records/officials")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getOfficials),
      ANY: methodNotAllowed,
    },
  },
});
