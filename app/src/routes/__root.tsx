import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/context/ThemeProvider";
import { THEME_SCRIPT } from "@/context/ThemeContext";
import { HTML_CACHE_HEADERS } from "@/lib/cache-headers";
import { todaysGamesQueryOptions } from "@/hooks/useGames";
import { prefetchForSsr } from "@/lib/ssr-prefetch";
import { Header, Footer, ScoresStrip } from "@/components/shared";
import appCss from "@/index.css?url";
import onestLatin from "@fontsource-files/onest/files/onest-latin-wght-normal.woff2?url";
import funnelDisplayLatin from "@fontsource-files/funnel-display/files/funnel-display-latin-wght-normal.woff2?url";

interface RouterContext {
  queryClient: QueryClient;
}

const title = "Benchwarmer Analytics";
const description = "Personal hockey analytics research platform";

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootLayout() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system">
        <TooltipProvider delayDuration={300}>
          <div className="min-h-screen flex flex-col bg-background">
            <Header />
            <ScoresStrip />
            <main className="flex-1">
              <Outlet />
            </main>
            <Footer />
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  // The layout (header, scores strip, footer) renders on the server for every
  // page; child routes opt in with `ssr: true` (see start.ts).
  ssr: true,
  loader: ({ context }) =>
    prefetchForSsr([context.queryClient.prefetchQuery(todaysGamesQueryOptions)]),
  headers: () => HTML_CACHE_HEADERS,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { title },
      { name: "description", content: description },
      { name: "theme-color", content: "#fafafa", media: "(prefers-color-scheme: light)" },
      { name: "theme-color", content: "#0a0a0a", media: "(prefers-color-scheme: dark)" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:image", content: "/icons/icon-512.png" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      // Text renders only after the client bundle runs, so without these the
      // fonts would start downloading after the JS instead of alongside it.
      { rel: "preload", href: onestLatin, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
      { rel: "preload", href: funnelDisplayLatin, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
      { rel: "icon", type: "image/svg+xml", href: "/logo-tile.svg" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/icons/favicon-32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/icons/favicon-16.png" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootLayout,
});
