import { createFileRoute } from "@tanstack/react-router";
import { apiHandler, CacheTier } from "@/server/api/handler";
import { getAttendance } from "@/server/api/records";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/records/attendance")({
  server: {
    handlers: {
      GET: apiHandler(CacheTier.ingested, getAttendance),
      ANY: methodNotAllowed,
    },
  },
});
