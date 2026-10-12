import { createStart } from "@tanstack/react-start";

// Routes render client-side only unless they opt in with `ssr: true`. The root
// layout and the homepage are server-rendered. Before opting a route in, make
// sure it renders the same on server and client (no window/localStorage or
// theme state during render) and that its loader prefetches its queries with
// prefetchForSsr (src/lib/ssr-prefetch.ts).
export const startInstance = createStart(() => ({
  defaultSsr: false,
}));
