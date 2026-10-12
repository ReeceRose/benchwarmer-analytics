import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getPlayer } from "@/server/api/players";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/players/$id/")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getPlayer),
      ANY: methodNotAllowed,
    },
  },
});
