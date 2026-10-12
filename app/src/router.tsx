import { createRouter } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { routeTree } from "@/routeTree.gen";
import { RouteError, RoutePending } from "@/components/shared/RouteStates";

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Most data changes once a day (ingestion); live hooks set shorter times.
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Warm route code and loader data when a link is hovered or focused.
    defaultPreload: "intent",
    // Loaders only prime the Query cache, so let Query decide freshness.
    defaultPreloadStaleTime: 0,
    defaultPendingComponent: RoutePending,
    defaultErrorComponent: RouteError,
  });

  // Sends queries fetched during SSR to the browser's cache. Only successful
  // ones: anything that failed on the server is retried in the browser.
  // __root.tsx provides the QueryClient itself.
  setupRouterSsrQueryIntegration({
    router,
    queryClient,
    wrapQueryClient: false,
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => query.state.status === "success",
    },
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
