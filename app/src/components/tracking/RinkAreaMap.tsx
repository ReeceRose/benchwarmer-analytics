import { HalfRink } from "@/components/shot-explorer/HalfRink";
import { standing } from "@/components/tracking/tracking-format";
import { formatOrdinal } from "@/lib/formatters";
import type { TrackingArea } from "@/types";

// The NHL's EDGE rink areas as rectangles on the half rink (feet; the goal
// line is x = 11, the blue line x = 75, y runs down). Left and right are the
// shooter's, facing the net, so "L" areas sit at the bottom of the drawing.
// "Beyond Red Line" is off this map and listed under it.
type Rect = [x: number, y: number, width: number, height: number];
const AREAS: Record<string, Rect[]> = {
  "Behind the Net": [[0, -22, 11, 44]],
  "L Corner": [[0, 22, 17, 20.5]],
  "R Corner": [[0, -42.5, 17, 20.5]],
  Crease: [[11, -4, 6, 8]],
  "L Net Side": [[11, 4, 6, 18]],
  "R Net Side": [[11, -22, 6, 18]],
  "Low Slot": [[17, -10, 14, 20]],
  "High Slot": [[31, -10, 15, 20]],
  "L Circle": [[17, 10, 29, 20]],
  "R Circle": [[17, -30, 29, 20]],
  "Outside L": [[17, 30, 29, 12.5]],
  "Outside R": [[17, -42.5, 29, 12.5]],
  "Center Point": [[46, -14, 29, 28]],
  "L Point": [[46, 14, 29, 28.5]],
  "R Point": [[46, -42.5, 29, 28.5]],
  "Offensive Neutral Zone": [[75, -42.5, 25, 85]],
};
const OFF_MAP = "Beyond Red Line";

// Label spots where the middle of the rectangle is cut off by the rounded
// boards or the net.
const LABEL_AT: Record<string, [number, number]> = {
  "Behind the Net": [4.5, 0],
  "L Corner": [11.5, 31],
  "R Corner": [11.5, -31],
  "L Net Side": [14, 13],
  "R Net Side": [14, -13],
};

function labelSpot(name: string, rects: Rect[]): { x: number; y: number; size: number } {
  const [x, y, w, h] = rects[0];
  const [lx, ly] = LABEL_AT[name] ?? [x + w / 2, y + h / 2];
  // Narrow cells get smaller text so ".912" fits.
  return { x: lx, y: ly, size: Math.min(3.4, Math.max(2.2, w / 2.6)) };
}

/**
 * The 17 EDGE areas in one hue (`chart-1`, stronger for more shots or a
 * better league standing, see `shade`), with the value printed in each.
 * `format` turns a value into the label (shot count, ".912").
 */
export function RinkAreaMap({
  areas,
  format,
  noun,
  label,
  shade,
}: {
  areas: TrackingArea[];
  format: (area: TrackingArea) => string;
  /** For hover text, e.g. "shots on goal". */
  noun: string;
  label: string;
  /**
   * "share": darker where more of the shots came from (shot counts).
   * "standing": darker where the percentile or rank is better (save %).
   */
  shade: "share" | "standing";
}) {
  const byName = new Map(areas.map((a) => [a.area, a]));
  const offMap = byName.get(OFF_MAP);
  const most = Math.max(1, ...areas.filter((a) => a.area !== OFF_MAP).map((a) => a.value ?? 0));
  const strength = (area: TrackingArea | undefined): number | null => {
    if (!area) return null;
    if (shade === "share") return (area.value ?? 0) / most;
    const pctl = standing(area);
    return pctl == null ? null : pctl / 100;
  };
  return (
    <div className="mx-auto max-w-md">
      <HalfRink label={label} showSlot={false} underlay>
        {Object.entries(AREAS).map(([name, rects]) => {
          const area = byName.get(name);
          const pctl = area ? standing(area) : null;
          const k = strength(area);
          const opacity = k == null ? 0 : 0.04 + 0.62 * k;
          const spot = labelSpot(name, rects);
          const where = area?.rank != null ? `${formatOrdinal(area.rank)} in the league` : pctl != null ? `${formatOrdinal(pctl)} percentile` : "no data";
          return (
            <g key={name}>
              <title>{`${name}: ${area ? `${format(area)} ${noun}` : "–"}, ${where}`}</title>
              {rects.map(([x, y, w, h], i) => (
                <rect key={i} x={x} y={y} width={w} height={h} fill="var(--chart-1)" fillOpacity={opacity} stroke="var(--card)" strokeWidth={0.5} />
              ))}
              {area && (
                <text x={spot.x} y={spot.y} textAnchor="middle" dominantBaseline="central" fontSize={spot.size} fontWeight={600} fill="var(--foreground)">
                  {format(area)}
                </text>
              )}
            </g>
          );
        })}
      </HalfRink>
      {offMap && (
        <p className="mt-1 text-xs text-muted-foreground tabular-nums">
          Beyond the red line: {format(offMap)} {noun}
        </p>
      )}
    </div>
  );
}
