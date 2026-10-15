import { useCallback, useEffect, useState } from "react";
import { getBrandPalette, teamMarkColour } from "@/lib/team-colours";
import type { LiveGameResponse, TeamSide } from "@/types";

/**
 * A side colour choice: a chart token, one of the team's brand colours (by
 * index into its palette), or a custom hex from the colour input. Brand choices
 * resolve per game, so "brand-0" on the home side means "whoever is at home".
 */
export type SideColourChoice = `chart-${1 | 2 | 3 | 4 | 5}` | `brand-${0 | 1 | 2}` | `#${string}`;

export const DEFAULT_SIDE_COLOURS: Record<TeamSide, SideColourChoice> = { away: "chart-2", home: "chart-1" };

export const CHART_CHOICES: readonly SideColourChoice[] = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"];

const STORAGE_KEY = "benchwarmer:game-centre:side-colours";

// Choices saved before brand colours became a palette.
const LEGACY_CHOICES: Record<string, SideColourChoice> = { "brand-primary": "brand-0", "brand-accent": "brand-1" };

function toChoice(value: unknown, fallback: SideColourChoice): SideColourChoice {
  if (typeof value !== "string") return fallback;
  if (/^chart-[1-5]$|^brand-[0-2]$|^#[0-9a-f]{6}$/i.test(value)) return value as SideColourChoice;
  return LEGACY_CHOICES[value] ?? fallback;
}

function readChoices(): Record<TeamSide, SideColourChoice> {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    return {
      away: toChoice(stored?.away, DEFAULT_SIDE_COLOURS.away),
      home: toChoice(stored?.home, DEFAULT_SIDE_COLOURS.home),
    };
  } catch {
    return { ...DEFAULT_SIDE_COLOURS };
  }
}

/** The CSS colour for a choice; brand colours go through `teamMarkColour()`. */
export function resolveSideColour(choice: SideColourChoice, abbrev: string): string {
  if (choice.startsWith("#")) return choice;
  if (choice.startsWith("chart-")) return `var(--${choice})`;
  const palette = getBrandPalette(abbrev);
  const hex = palette[Number(choice.slice("brand-".length))] ?? palette[0];
  return hex ? teamMarkColour(hex) : `var(--${DEFAULT_SIDE_COLOURS.home})`;
}

/** Away/home colours for the game centre, remembered across games in localStorage. */
export function useSideColours(data: LiveGameResponse | undefined) {
  const [choices, setChoices] = useState(readChoices);

  const setChoice = useCallback((side: TeamSide, choice: SideColourChoice | null) => {
    setChoices((prev) => {
      const next = { ...prev, [side]: choice ?? DEFAULT_SIDE_COLOURS[side] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage can be unavailable (private mode); the choice still applies for this visit.
      }
      return next;
    });
  }, []);

  // `teamColour()` reads these. They go on the root element, not the game centre
  // wrapper, so chart tooltips (portaled to <body>) follow the choice too.
  const away = resolveSideColour(choices.away, data?.away.abbrev ?? "");
  const home = resolveSideColour(choices.home, data?.home.abbrev ?? "");
  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--team-away", away);
    root.setProperty("--team-home", home);
    return () => {
      root.removeProperty("--team-away");
      root.removeProperty("--team-home");
    };
  }, [away, home]);

  return { choices, setChoice };
}
