import { createFileRoute } from "@tanstack/react-router";
import { methodNotAllowed } from "@/server/http";

// Unknown /api/* paths return a JSON 404 instead of falling through to the
// HTML app shell. Real endpoints are more specific routes and win.
function notFound() {
  return Response.json({ error: "Not found" }, { status: 404 });
}

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      GET: notFound,
      ANY: methodNotAllowed,
    },
  },
});
