import { createFileRoute } from "@tanstack/react-router";
import { cronHandler } from "@/server/cron";
import { catchUp } from "@/server/cron-jobs";
import { methodNotAllowed } from "@/server/http";

// Evening re-run of any daily job that failed or never ran today, so a bad
// morning doesn't leave the site a day behind.
export const Route = createFileRoute("/api/cron/catch-up")({
  server: {
    handlers: {
      GET: cronHandler(catchUp),
      ANY: methodNotAllowed,
    },
  },
});
