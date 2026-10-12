import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getPool, type Queryable } from "@/server/ingestion/db";
import { currentSeason } from "@/server/ingestion/normalize";
import { failStaleRuns } from "@/server/ingestion/sync-runs";

// Vercel Cron calls each route with `Authorization: Bearer <CRON_SECRET>`.
// Fails closed when CRON_SECRET isn't configured.
export function authorizeCron(request: Request): Response | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

const seasonParam = z.coerce.number().int().min(2008).max(2100);

// Optional ?season=YYYY for manual re-runs; defaults to the current season.
export function seasonFromRequest(request: Request): number | Response {
  const raw = new URL(request.url).searchParams.get("season");
  if (raw === null) return currentSeason();
  const parsed = seasonParam.safeParse(raw);
  return parsed.success ? parsed.data : Response.json({ error: "Invalid season" }, { status: 400 });
}

// Wraps a cron job: auth, ?season parsing, stale-run cleanup, JSON result, no caching.
export function cronHandler(job: (db: Queryable, season: number) => Promise<Record<string, unknown>>) {
  return async ({ request }: { request: Request }) => {
    const denied = authorizeCron(request);
    if (denied) return denied;
    const season = seasonFromRequest(request);
    if (season instanceof Response) return season;
    const db = getPool();
    const started = Date.now();
    try {
      await failStaleRuns(db, 60);
      const result = await job(db, season);
      return Response.json({ ok: true, ms: Date.now() - started, ...result }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      console.error("cron job failed", error);
      return Response.json(
        { ok: false, ms: Date.now() - started, error: error instanceof Error ? error.message : String(error) },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }
  };
}
