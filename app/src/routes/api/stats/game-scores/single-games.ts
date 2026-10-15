import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getSingleGameRecords } from "@/server/api/game-scores";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/stats/game-scores/single-games")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getSingleGameRecords),
      ANY: methodNotAllowed,
    },
  },
});
