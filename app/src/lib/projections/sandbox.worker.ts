import { runSandbox, type SandboxSettings } from "@/lib/projections/sandbox";
import type { SandboxInputs } from "@/types";

// Runs sandbox simulations off the main thread. The inputs are sent once;
// each run message carries only the settings.

export type SandboxWorkerMessage = { type: "inputs"; inputs: SandboxInputs } | { type: "run"; id: number; settings: SandboxSettings };

let inputs: SandboxInputs | null = null;

self.onmessage = (event: MessageEvent<SandboxWorkerMessage>) => {
  const message = event.data;
  if (message.type === "inputs") {
    inputs = message.inputs;
  } else if (inputs) {
    self.postMessage({ id: message.id, odds: runSandbox(inputs, message.settings) });
  }
};
