import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getTrophies } from "@/server/api/trophies";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/trophies/")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getTrophies),
      ANY: methodNotAllowed,
    },
  },
});
