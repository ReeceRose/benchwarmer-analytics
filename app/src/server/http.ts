// Without an ANY handler, unsupported methods on an /api route fall through to
// the HTML page renderer. Mirror ASP.NET's 405 for wrong-method requests.
export function methodNotAllowed() {
  return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
}
