import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getDraft } from "@/server/api/history";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/draft")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getDraft),
      ANY: methodNotAllowed,
    },
  },
});
