import { useEffect, useRef, useState } from "react";
import type { TeamOdds } from "@/lib/projections/simulate";
import type { SandboxSettings } from "@/lib/projections/sandbox";
import type { SandboxWorkerMessage } from "@/lib/projections/sandbox.worker";
import type { SandboxInputs } from "@/types";

/** Waits this long after the last change before simulating, so dragging a slider runs once. */
const DEBOUNCE_MS = 200;

/**
 * Sandbox odds for the given settings, simulated in a web worker. Keeps the
 * previous odds on screen while a new run is in flight; only the latest
 * settings are ever run.
 */
export function useSandboxOdds(inputs: SandboxInputs | null | undefined, settings: SandboxSettings | null) {
  const worker = useRef<Worker | null>(null);
  const latest = useRef(0);
  const [odds, setOdds] = useState<TeamOdds[] | null>(null);
  const [running, setRunning] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!inputs) return;
    let cancelled = false;
    let w: Worker | null = null;
    import("@/lib/projections/sandbox.worker?worker").then(({ default: SandboxWorker }) => {
      if (cancelled) return;
      w = new SandboxWorker();
      w.onmessage = (event: MessageEvent<{ id: number; odds: TeamOdds[] }>) => {
        if (event.data.id !== latest.current) return;
        setOdds(event.data.odds);
        setRunning(false);
      };
      w.postMessage({ type: "inputs", inputs } satisfies SandboxWorkerMessage);
      worker.current = w;
      setReady(true);
    });
    return () => {
      cancelled = true;
      w?.terminate();
      worker.current = null;
      setReady(false);
    };
  }, [inputs]);

  const key = JSON.stringify(settings);
  useEffect(() => {
    if (!ready || !settings) return;
    setRunning(true);
    const timer = setTimeout(() => {
      latest.current += 1;
      worker.current?.postMessage({ type: "run", id: latest.current, settings } satisfies SandboxWorkerMessage);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // `key` stands in for `settings`, which is a new object on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, key]);

  return { odds, running };
}
