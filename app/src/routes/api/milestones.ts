import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getMilestones } from "@/server/api/milestones";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/milestones")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.team, getMilestones),
      ANY: methodNotAllowed,
    },
  },
});
