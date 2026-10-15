import { createFileRoute } from "@tanstack/react-router";
import { cronHandler } from "@/server/cron";
import { DAILY_JOBS } from "@/server/cron-jobs";
import { methodNotAllowed } from "@/server/http";

// See DAILY_JOBS.schedule for what this job does.
export const Route = createFileRoute("/api/cron/schedule")({
  server: {
    handlers: {
      GET: cronHandler(DAILY_JOBS.schedule.run),
      ANY: methodNotAllowed,
    },
  },
});
