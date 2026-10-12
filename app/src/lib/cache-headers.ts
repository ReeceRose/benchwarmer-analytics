// Tag on every CDN-cached response (API JSON and pages). The cron jobs
// invalidate it after writing data (see src/server/cron.ts).
export const CACHE_TAG = "api";

// Pages: the CDN keeps the HTML, which can include server-rendered data, for 5
// minutes and then serves it stale while refreshing. Browsers always
// revalidate, so a new deployment's assets are picked up right away.
export const HTML_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
  "Vercel-Cache-Tag": CACHE_TAG,
};
