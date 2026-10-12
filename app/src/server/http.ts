// Without an ANY handler, unsupported methods on an /api route fall through to
// the HTML page renderer, so wrong-method requests get a 405 instead.
export function methodNotAllowed() {
  return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
}
