import { getDb, type Database } from "@/server/db/client";
import { HttpError } from "@/server/api/errors";
import { QueryParams } from "@/server/api/query";

// CDN cache lifetimes per tier. Vercel's CDN keys on the full URL, so every
// query-string variant is cached separately.
export const CacheTier = {
  static: 24 * 60 * 60,
  semiStatic: 6 * 60 * 60,
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

// Browsers always revalidate; the CDN serves cached copies for the tier's
// lifetime and refreshes in the background for as long again.
function cacheControl(seconds: number): string {
  return `public, max-age=0, s-maxage=${seconds}, stale-while-revalidate=${seconds}`;
}

export function json(body: unknown, tier: CacheTier): Response {
  return Response.json(body, { headers: { "Cache-Control": cacheControl(tier) } });
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
