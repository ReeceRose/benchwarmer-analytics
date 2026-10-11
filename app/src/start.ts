import { createStart } from "@tanstack/react-start";

// Routes render client-side only (SPA-style) until they are audited for SSR.
// Components use window/localStorage freely, and the root shell is the only
// server-rendered part of the page.
export const startInstance = createStart(() => ({
  defaultSsr: false,
}));
