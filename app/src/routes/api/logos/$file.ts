import { createFileRoute } from "@tanstack/react-router";
import { methodNotAllowed } from "@/server/http";

const LOGO_FILE = /^[A-Z.]{2,4}_(light|dark)\.svg$/;

// Team logos re-served from our origin so the share card can be exported as
// an image (assets.nhle.com has no CORS headers, which taints the canvas).
export const Route = createFileRoute("/api/logos/$file")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!LOGO_FILE.test(params.file)) {
          return Response.json({ error: "Unknown logo", code: "NOT_FOUND" }, { status: 404 });
        }
        const upstream = await fetch(`https://assets.nhle.com/logos/nhl/svg/${params.file}`);
        if (!upstream.ok) {
          return Response.json({ error: "Logo unavailable", code: "UPSTREAM_ERROR" }, { status: 502 });
        }
        return new Response(upstream.body, {
          headers: {
            "Content-Type": "image/svg+xml",
            "Cache-Control": "public, max-age=86400, s-maxage=2592000",
          },
        });
      },
      ANY: methodNotAllowed,
    },
  },
});
