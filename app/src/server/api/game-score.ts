import { round } from "@/server/api/format";
import type { LiveGameScore } from "@/types";

// Dom Luszczyszyn's Game Score weights. Individual stats count in all
// situations and on-ice stats at 5v5 only, which reproduces MoneyPuck's
// season `gameScore` exactly (see docs/INGESTION_NOTES.md).
export const GAME_SCORE_WEIGHTS = {
  goals: 0.75,
  primaryAssists: 0.7,
  secondaryAssists: 0.55,
  shotsOnGoal: 0.075,
  blocks: 0.05,
  penaltiesDrawn: 0.15,
  penaltiesTaken: -0.15,
  faceoffWins: 0.01,
  faceoffLosses: -0.01,
  onIceAttemptsFor5v5: 0.05,
  onIceAttemptsAgainst5v5: -0.05,
  onIceGoalsFor5v5: 0.15,
  onIceGoalsAgainst5v5: -0.15,
} as const;

export type GameScoreInputs = Record<keyof typeof GAME_SCORE_WEIGHTS, number>;

const SCORING = ["goals", "primaryAssists", "secondaryAssists", "shotsOnGoal"] as const;
const ON_ICE = ["onIceAttemptsFor5v5", "onIceAttemptsAgainst5v5", "onIceGoalsFor5v5", "onIceGoalsAgainst5v5"] as const;
const OTHER = ["blocks", "penaltiesDrawn", "penaltiesTaken", "faceoffWins", "faceoffLosses"] as const;

const weigh = (inputs: GameScoreInputs, keys: readonly (keyof GameScoreInputs)[]) =>
  keys.reduce((sum, k) => sum + GAME_SCORE_WEIGHTS[k] * inputs[k], 0);

/** One skater's Game Score, split into scoring, 5v5 on-ice play, and everything else. */
export function gameScore(inputs: GameScoreInputs): LiveGameScore {
  const scoring = weigh(inputs, SCORING);
  const onIce = weigh(inputs, ON_ICE);
  const other = weigh(inputs, OTHER);
  return {
    total: round(scoring + onIce + other, 2),
    scoring: round(scoring, 2),
    onIce: round(onIce, 2),
    other: round(other, 2),
  };
}
