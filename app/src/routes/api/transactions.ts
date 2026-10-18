import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getLeagueTransactions } from "@/server/api/injuries";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/transactions")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getLeagueTransactions),
      ANY: methodNotAllowed,
    },
  },
});
