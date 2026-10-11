import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { searchPlayers } from "@/server/api/players";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/players/")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.search, searchPlayers),
      ANY: methodNotAllowed,
    },
  },
});
