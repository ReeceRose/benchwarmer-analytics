import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getGamePreview } from "@/server/api/games";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/games/$gameId/preview")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.team, getGamePreview),
      ANY: methodNotAllowed,
    },
  },
});
