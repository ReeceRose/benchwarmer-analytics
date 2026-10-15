/** Roughly five ticks on a round step that covers the values. */
export function niceAxis(
  values: readonly number[],
  { includeZero = false, pad = 0 }: { includeZero?: boolean; pad?: number } = {},
): { domain: [number, number]; ticks: number[] } {
  const low = Math.min(...values, includeZero ? 0 : Infinity) - pad;
  const high = Math.max(...values) + pad;
  const span = Math.max(high - low, 1e-9);
  const raw = span / 5;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const whole = values.every((v) => Number.isInteger(v));
  const multipliers = whole && magnitude <= 1 ? [1, 2, 5, 10] : [1, 2, 2.5, 5, 10];
  const step = Math.max(whole ? 1 : 0, multipliers.map((m) => m * magnitude).find((s) => s >= raw) ?? 10 * magnitude);
  // Non-negative data never gets an axis below zero.
  const floor = Math.min(...values) >= 0 ? 0 : -Infinity;
  const min = Math.max(floor, includeZero ? Math.min(0, Math.floor(low / step) * step) : Math.floor(low / step) * step);
  const max = Math.max(min + step, Math.ceil(high / step) * step);
  const ticks: number[] = [];
  for (let v = min; v <= max + step / 2; v += step) ticks.push(Number(v.toFixed(10)));
  return { domain: [min, max], ticks };
}
