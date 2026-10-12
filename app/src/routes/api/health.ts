import { createFileRoute } from "@tanstack/react-router";
import { sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { methodNotAllowed } from "@/server/http";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const started = performance.now();
        try {
          await getDb().execute(sql`select 1`);
          return Response.json(
            { status: "ok", db: "ok", latencyMs: Math.round(performance.now() - started) },
            { headers: { "Cache-Control": "no-store" } },
          );
        } catch (error) {
          console.error("Health check failed", error);
          return Response.json(
            { status: "error", db: "unreachable" },
            { status: 503, headers: { "Cache-Control": "no-store" } },
          );
        }
      },
      ANY: methodNotAllowed,
    },
  },
});
