import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getPlayerLinemates } from "@/server/api/players";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/players/$id/linemates")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getPlayerLinemates),
      ANY: methodNotAllowed,
    },
  },
});
