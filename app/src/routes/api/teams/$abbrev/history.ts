import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getFranchiseHistory } from "@/server/api/history";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/teams/$abbrev/history")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getFranchiseHistory),
      ANY: methodNotAllowed,
    },
  },
});
