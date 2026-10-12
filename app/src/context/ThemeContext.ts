import { createContext } from "react";

type Theme = "dark" | "light" | "system";

export const THEME_STORAGE_KEY = "benchwarmer-theme";

// Inlined in the document head: applies the stored (or system) theme before
// first paint, so server-rendered pages don't flash the wrong theme.
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.add(d?"dark":"light")}catch(e){}})()`;

export interface ThemeProviderState {
  theme: Theme;
  /** The theme actually applied, with "system" resolved. */
  resolvedTheme: "dark" | "light";
  setTheme: (theme: Theme) => void;
}

export const ThemeProviderContext = createContext<ThemeProviderState | undefined>(
  undefined
);
