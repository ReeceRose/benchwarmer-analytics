import { OVERTIME_COEFFICIENTS, REGULATION_COEFFICIENTS } from "@/server/api/win-probability-model";

// In-game win probability: a logistic model of the home team's chance from
// time left, goal difference and manpower, fitted on MoneyPuck shots
// (scripts/fit-win-probability.ts).

const REGULATION_SECONDS = 3600;

/**
 * Regulation features. Goal difference and manpower matter more as time runs
 * out, so each also enters divided by √(time left); `en` is pulled goalies
 * (home pulled = +1), which is worth more than a power play.
 */
export function regulationFeatures(remaining: number, diff: number, pp: number, en: number): number[] {
  const r = Math.max(0, remaining) / REGULATION_SECONDS;
  const s = Math.sqrt(r + 0.01);
  return [1, r, diff, diff / s, diff * r, pp, pp / s, en, en / s];
}

/** Overtime (still tied): home ice and manpower. */
export const OT_FEATURES = (pp: number): number[] => [1, pp];

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
const dot = (x: number[], b: readonly number[]) => x.reduce((s, v, i) => s + v * (b[i] ?? 0), 0);

export interface WinProbabilityState {
  /** Game seconds elapsed (period 2 starts at 1200). */
  t: number;
  homeGoals: number;
  awayGoals: number;
  /** +1 home has more skaters, −1 away does, 0 even (pulled goalies aside). */
  pp: number;
  /** +1 home goalie pulled, −1 away goalie pulled. */
  en: number;
}

/**
 * The home team's chance of winning. `pregameShift` moves the starting point
 * on the logit scale (e.g. from a matchup rating) and fades to nothing by the
 * end of regulation.
 */
export function homeWinProbability(state: WinProbabilityState, pregameShift = 0): number {
  const diff = state.homeGoals - state.awayGoals;
  if (state.t >= REGULATION_SECONDS) {
    // Overtime is sudden death: a goal ends it.
    if (diff !== 0) return diff > 0 ? 1 : 0;
    return sigmoid(dot(OT_FEATURES(state.pp), OVERTIME_COEFFICIENTS));
  }
  const remaining = REGULATION_SECONDS - state.t;
  const z = dot(regulationFeatures(remaining, Math.max(-5, Math.min(5, diff)), state.pp, state.en), REGULATION_COEFFICIENTS);
  return sigmoid(z + pregameShift * (remaining / REGULATION_SECONDS));
}
