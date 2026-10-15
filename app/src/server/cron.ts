import { timingSafeEqual } from "node:crypto";
import { invalidateByTag } from "@vercel/functions";
import { z } from "zod";
import { CACHE_TAG } from "@/lib/cache-headers";
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

// Marks every cached API response and page stale so the CDN refetches it in
// the background on the next request. A no-op outside Vercel (e.g. local dev).
async function invalidateApiCache(): Promise<void> {
  try {
    await invalidateByTag(CACHE_TAG);
  } catch (error) {
    console.error("API cache invalidation failed", error);
  }
}

// Some of a job's independent steps failed. The others' writes stand, so the
// cache is still invalidated, but the route answers 500 so the run shows as
// failed in Vercel.
export class PartialFailure extends Error {
  readonly result: Record<string, unknown>;
  readonly failures: string[];

  constructor(result: Record<string, unknown>, failures: string[]) {
    super(failures.join("; "));
    this.result = result;
    this.failures = failures;
  }
}

// Runs steps that don't depend on each other, in order, each whether or not
// an earlier one failed. Throws PartialFailure (with the successful results)
// if any failed.
export async function runIndependently(steps: Record<string, () => Promise<unknown>>): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {};
  const failures: string[] = [];
  for (const [name, step] of Object.entries(steps)) {
    try {
      result[name] = await step();
    } catch (error) {
      failures.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (failures.length > 0) throw new PartialFailure(result, failures);
  return result;
}

// Wraps a cron job: auth, ?season parsing, stale-run cleanup, JSON result, no
// caching. On success, invalidates the CDN cache.
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
      await invalidateApiCache();
      return Response.json({ ok: true, ms: Date.now() - started, ...result }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      console.error("cron job failed", error);
      if (error instanceof PartialFailure) await invalidateApiCache();
      return Response.json(
        {
          ok: false,
          ms: Date.now() - started,
          ...(error instanceof PartialFailure ? { rowsWritten: error.result } : {}),
          error: error instanceof Error ? error.message : String(error),
        },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }
  };
}
