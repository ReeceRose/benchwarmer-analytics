/** A probability as a whole percentage, with "<1%" and ">99%" at the ends. */
export function formatOdds(p: number): string {
  if (p <= 0) return "0%";
  if (p >= 1) return "100%";
  if (p < 0.005) return "<1%";
  if (p > 0.995) return ">99%";
  return `${Math.round(p * 100)}%`;
}

/** Day-over-day playoff-odds moves smaller than this are simulation noise and normal drift. */
export const NOTABLE_CHANGE = 0.03;
