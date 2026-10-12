import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getShooterStats } from "@/server/api/shots";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/teams/$abbrev/shots/shooters")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.team, getShooterStats),
      ANY: methodNotAllowed,
    },
  },
});
