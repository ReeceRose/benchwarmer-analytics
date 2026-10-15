import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getTeamTransactions } from "@/server/api/injuries";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/teams/$abbrev/transactions")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getTeamTransactions),
      ANY: methodNotAllowed,
    },
  },
});
