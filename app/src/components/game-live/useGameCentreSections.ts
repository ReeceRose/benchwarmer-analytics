import { useCallback, useState } from "react";

export const GAME_CENTRE_SECTIONS = [
  { id: "summary", label: "Summary tiles", group: "Overview" },
  { id: "teamStats", label: "Team stats", group: "Overview" },
  { id: "winProbability", label: "Win probability", group: "Overview" },
  { id: "flow", label: "Game flow", group: "Shots" },
  { id: "shotMap", label: "Shot map & profile", group: "Shots" },
  { id: "replays", label: "Goal replays", group: "Shots" },
  { id: "gameScore", label: "Game Score", group: "Players" },
  { id: "goalies", label: "Goaltending", group: "Players" },
  { id: "boxscore", label: "Box score", group: "Players" },
  { id: "skaters", label: "Advanced skater stats", group: "Players" },
  { id: "leaders", label: "Game leaders", group: "Players" },
  { id: "lines", label: "Lines & pairs", group: "Deployment" },
  { id: "shiftChart", label: "Shift chart", group: "Deployment" },
  { id: "onIce", label: "On ice now", group: "Deployment" },
  { id: "puckEvents", label: "Hits & puck battles", group: "Events" },
  { id: "penalties", label: "Penalties", group: "Events" },
  { id: "season", label: "Season context", group: "Context" },
  { id: "info", label: "Game info", group: "Context" },
] as const;

export type GameCentreSectionId = (typeof GAME_CENTRE_SECTIONS)[number]["id"];

export const ESSENTIAL_SECTIONS: readonly GameCentreSectionId[] = [
  "summary", "teamStats", "winProbability", "flow", "shotMap", "gameScore", "goalies", "boxscore", "penalties",
];

const STORAGE_KEY = "benchwarmer:game-centre:hidden";

function readHidden(): Set<GameCentreSectionId> {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return new Set(Array.isArray(stored) ? stored : []);
  } catch {
    return new Set();
  }
}

/** Which game centre sections are shown, remembered across games in localStorage. */
export function useGameCentreSections() {
  const [hidden, setHiddenState] = useState<Set<GameCentreSectionId>>(readHidden);

  const save = useCallback((next: Set<GameCentreSectionId>) => {
    setHiddenState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    } catch {
      // Storage can be unavailable (private mode); the choice still applies for this visit.
    }
  }, []);

  const isVisible = useCallback((id: GameCentreSectionId) => !hidden.has(id), [hidden]);

  const setVisible = useCallback(
    (id: GameCentreSectionId, visible: boolean) => {
      const next = new Set(hidden);
      if (visible) next.delete(id);
      else next.add(id);
      save(next);
    },
    [hidden, save],
  );

  const showOnly = useCallback(
    (ids: readonly GameCentreSectionId[] | "all" | "none") => {
      const all = GAME_CENTRE_SECTIONS.map((s) => s.id);
      if (ids === "all") save(new Set());
      else if (ids === "none") save(new Set(all));
      else save(new Set(all.filter((id) => !ids.includes(id))));
    },
    [save],
  );

  return { isVisible, setVisible, showOnly, hiddenCount: hidden.size };
}
