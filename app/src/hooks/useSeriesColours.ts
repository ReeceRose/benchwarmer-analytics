import { useMemo, useState } from "react";
import { CHART_COLOURS } from "@/lib/chart-colours";

type Id = number | string;
type Slots<T extends Id> = ReadonlyMap<T, number>;

/** Keep each id's slot; give new ids the lowest free one. */
function assignSlots<T extends Id>(previous: Slots<T>, ids: readonly T[]): Slots<T> {
  const next = new Map<T, number>();
  for (const id of ids) {
    const slot = previous.get(id);
    if (slot != null) next.set(id, slot);
  }
  for (const id of ids) {
    if (next.has(id)) continue;
    const taken = new Set(next.values());
    let slot = 0;
    while (taken.has(slot)) slot++;
    next.set(id, slot);
  }
  return next;
}

const sameSlots = <T extends Id>(a: Slots<T>, b: Slots<T>) => a.size === b.size && [...a].every(([id, slot]) => b.get(id) === slot);

/**
 * Series colours for a user-picked set (players on Compare or Age curves,
 * teams on the special teams all-teams chart).
 * A colour follows its entity: removing one player doesn't repaint the rest.
 * Callers cap the set at CHART_COLOURS.length.
 */
export function useSeriesColours<T extends Id>(ids: readonly T[]): (id: T) => string {
  const [slots, setSlots] = useState<Slots<T>>(() => assignSlots(new Map(), ids));
  const next = assignSlots(slots, ids);
  if (!sameSlots(slots, next)) setSlots(next);
  const key = [...next].map(([id, slot]) => `${id}:${slot}`).join(",");
  return useMemo(() => {
    const byId = new Map(
      key
        ? key.split(",").map((pair) => {
            const at = pair.lastIndexOf(":");
            return [pair.slice(0, at), Number(pair.slice(at + 1))] as const;
          })
        : [],
    );
    return (id: T) => CHART_COLOURS[byId.get(String(id)) ?? 0] ?? CHART_COLOURS[0];
  }, [key]);
}
