import { getDb, type Database } from "@/server/db/client";
import { HttpError } from "@/server/api/errors";
import { QueryParams } from "@/server/api/query";
import { CACHE_TAG } from "@/lib/cache-headers";

// CDN cache lifetimes per tier. Vercel's CDN keys on the full URL, so every
// query-string variant is cached separately. The cron jobs invalidate every
// cached response when they finish (see CACHE_TAG), so data that only
// changes through ingestion can be cached for a day.
export const CacheTier = {
  static: 24 * 60 * 60,
  // Read only from our database, so it changes only when a cron job runs.
  ingested: 24 * 60 * 60,
  semiStatic: 6 * 60 * 60,
  // Depends on the NHL API (e.g. current standings), which changes on its own.
  team: 30 * 60,
  search: 5 * 60,
  live: 15,
} as const;

export type CacheTier = (typeof CacheTier)[keyof typeof CacheTier];

export interface ApiContext {
  db: Database;
  params: Record<string, string>;
  query: QueryParams;
  request: Request;
}

// The CDN serves cached copies for the tier's lifetime, then serves stale
// copies while it refreshes in the background, so visitors rarely wait on the
// database. Browsers keep their own copy for up to 5 minutes (live data: not at
// all) so reloads and back-navigation skip the network.
function cacheControl(seconds: number): string {
  const browser = seconds <= CacheTier.live ? 0 : Math.min(seconds, 5 * 60);
  const stale = seconds <= CacheTier.live ? seconds : Math.max(seconds, 24 * 60 * 60);
  return `public, max-age=${browser}, s-maxage=${seconds}, stale-while-revalidate=${stale}`;
}

export function json(body: unknown, tier: CacheTier): Response {
  return Response.json(body, {
    headers: { "Cache-Control": cacheControl(tier), "Vercel-Cache-Tag": CACHE_TAG },
  });
}

// Wraps a GET handler: JSON body with the tier's cache header, HttpError →
// its status (uncached), anything else → 500.
export function apiHandler(tier: CacheTier, handler: (ctx: ApiContext) => Promise<unknown>) {
  return async ({ request, params }: { request: Request; params: Record<string, string> }) => {
    try {
      const query = new QueryParams(new URL(request.url).searchParams);
      const body = await handler({ db: getDb(), params, query, request });
      return body instanceof Response ? body : json(body, tier);
    } catch (error) {
      if (error instanceof HttpError) {
        return Response.json(error.body, { status: error.status, headers: { "Cache-Control": "no-store" } });
      }
      console.error(`GET ${new URL(request.url).pathname} failed`, error);
      return Response.json(
        { error: "Internal server error", code: "INTERNAL_ERROR" },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }
  };
}
