import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getNightlyGameScores } from "@/server/api/game-scores";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/stats/game-scores/nightly")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getNightlyGameScores),
      ANY: methodNotAllowed,
    },
  },
});
