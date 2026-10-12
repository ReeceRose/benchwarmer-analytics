import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getDeserveToWin } from "@/server/api/games";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/games/$gameId/deserve-to-win")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.semiStatic, getDeserveToWin),
      ANY: methodNotAllowed,
    },
  },
});
