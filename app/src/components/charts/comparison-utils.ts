/**
 * A range that fits the values (and a reference, if any) with a little room
 * either side, snapped to `step`. Use it for dot rows such as save
 * percentage, where a fixed range would clip outliers to the edge.
 */
export function fitDomain(
  values: (number | null | undefined)[],
  { reference, step = 0.01, pad = 0.15, max }: { reference?: number; step?: number; pad?: number; max?: number } = {},
): [number, number] {
  const present = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (reference != null) present.push(reference);
  if (present.length === 0) return [0, 1];
  const lo = Math.min(...present);
  const hi = Math.max(...present);
  const room = Math.max((hi - lo) * pad, step);
  const fitted: [number, number] = [Math.floor((lo - room) / step) * step, Math.ceil((hi + room) / step) * step];
  if (max != null) fitted[1] = Math.min(fitted[1], max);
  return fitted;
}

/** A range centred on zero that fits every value, for diverging bars (GSAx). */
export function symmetricDomain(values: (number | null | undefined)[], step = 1): [number, number] {
  const present = values.filter((v): v is number => v != null && Number.isFinite(v)).map(Math.abs);
  const span = Math.ceil(Math.max(step, ...present) / step) * step;
  return [-span, span];
}
