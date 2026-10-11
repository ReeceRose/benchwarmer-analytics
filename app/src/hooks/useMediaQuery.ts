import { useSyncExternalStore } from "react";

/**
 * React hook for responsive design using CSS media queries.
 * Uses useSyncExternalStore for proper subscription to browser APIs.
 *
 * @param query - CSS media query string (e.g., "(min-width: 640px)")
 * @returns boolean indicating if the media query matches
 *
 * @example
 * const isDesktop = useMediaQuery("(min-width: 640px)");
 * const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = (callback: () => void) => {
    const mediaQuery = window.matchMedia(query);
    mediaQuery.addEventListener("change", callback);
    return () => mediaQuery.removeEventListener("change", callback);
  };

  const getSnapshot = () => window.matchMedia(query).matches;

  const getServerSnapshot = () => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
