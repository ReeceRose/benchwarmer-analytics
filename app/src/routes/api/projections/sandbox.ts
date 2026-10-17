import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getSandboxInputs } from "@/server/api/projections";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/projections/sandbox")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getSandboxInputs),
      ANY: methodNotAllowed,
    },
  },
});
