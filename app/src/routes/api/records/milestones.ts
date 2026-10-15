import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getMilestoneClub } from "@/server/api/records";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/records/milestones")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getMilestoneClub),
      ANY: methodNotAllowed,
    },
  },
});
