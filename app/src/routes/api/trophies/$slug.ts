import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getTrophy } from "@/server/api/trophies";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/trophies/$slug")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getTrophy),
      ANY: methodNotAllowed,
    },
  },
});
