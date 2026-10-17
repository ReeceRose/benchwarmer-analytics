import { useEffect, useRef, useState } from "react";
import { detectGoal, type GoalAlert } from "@/lib/goal-alert";
import type { GameSummary } from "@/types";

const ALERT_MS = 8000;

export type ActiveGoalAlert = GoalAlert & { key: number };

/**
 * A goal scored while the reader is watching, for a few seconds after the poll
 * that brought it in. Never fires for goals already on the board at page load.
 * `key` changes per goal so animations restart on back-to-back goals.
 */
export function useGoalAlert(game: GameSummary | undefined) {
  const prev = useRef(game);
  const [alert, setAlert] = useState<ActiveGoalAlert | null>(null);

  useEffect(() => {
    const found = detectGoal(prev.current, game);
    prev.current = game;
    if (!found) return;
    setAlert({ ...found, key: Date.now() });
  }, [game]);

  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(() => setAlert(null), ALERT_MS);
    return () => clearTimeout(timer);
  }, [alert]);

  return alert;
}
