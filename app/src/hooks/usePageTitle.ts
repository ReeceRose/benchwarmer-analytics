import { useEffect } from "react";

const BASE_TITLE = "Benchwarmer Analytics";

/**
 * Sets the document title. Automatically appends the base title.
 * @param title - The page-specific title (e.g., "Boston Bruins"). Pass empty string for just the base title.
 */
export function usePageTitle(title: string | undefined) {
  useEffect(() => {
    if (title) {
      document.title = `${title} | ${BASE_TITLE}`;
    } else {
      document.title = BASE_TITLE;
    }
  }, [title]);
}
