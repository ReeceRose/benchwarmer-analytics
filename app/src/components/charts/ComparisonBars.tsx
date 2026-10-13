import { Swatch } from "@/components/game-live/parts";
import { CHART_COLOURS } from "@/lib/chart-colours";
import { cn } from "@/lib/utils";

export interface ComparisonSeries {
  name: string;
  colour?: string;
}

export interface ComparisonRow {
  label: string;
  /** One value per series, in series order. */
  values: (number | null)[];
  format: (value: number) => string;
  /**
   * Scale for the row. Bars grow from zero (both ways when the range spans
   * it, as with GSAx); when the range starts above zero (save percentages),
   * each value is a dot instead, so no bar is cut short.
   */
  domain?: [number, number];
  /** A tick on every track, such as the league average. */
  reference?: { value: number; label: string };
  lowerIsBetter?: boolean;
  /** Context rather than performance (TOI): no bold for the best value. */
  neutral?: boolean;
}

/**
 * Grouped horizontal bars: a row per stat, a track per series, real values on
 * the right and the best one in bold. The replacement for radar charts, which
 * hide the scale and distort area.
 */
export function ComparisonBars({
  series,
  rows,
  columns = 1,
}: {
  series: ComparisonSeries[];
  rows: ComparisonRow[];
  /** Lay the rows out in two columns on wide screens. */
  columns?: 1 | 2;
}) {
  const colourOf = (i: number) =>
    series[i].colour ?? CHART_COLOURS[i % CHART_COLOURS.length];

  return (
    <div className="space-y-4">
      {series.length > 1 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          {series.map((s, i) => (
            <span key={s.name} className="inline-flex items-center gap-1.5">
              <Swatch colour={colourOf(i)} />
              {s.name}
            </span>
          ))}
          <span>Bold = best</span>
        </div>
      )}
      <div
        className={cn(
          "grid gap-4",
          columns === 2 && "lg:grid-cols-2 lg:gap-x-10",
        )}
      >
        {rows.map((row) => {
          const present = row.values.filter(
            (v): v is number => v != null && Number.isFinite(v),
          );
          const [lo, hi] = row.domain ?? [
            0,
            Math.max(...present, row.reference?.value ?? 0) || 1,
          ];
          const dots = lo > 0;
          const frac = (v: number) =>
            Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
          const pos = (v: number) => `${frac(v) * 100}%`;
          const zero = frac(0);
          const best =
            row.neutral || present.length < 2
              ? null
              : row.lowerIsBetter
                ? Math.min(...present)
                : Math.max(...present);
          return (
            <div key={row.label}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-xs text-muted-foreground">
                <span>{row.label}</span>
                {row.reference && (
                  <span className="tabular-nums">
                    {row.reference.label} {row.format(row.reference.value)}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {row.values.map((v, i) => (
                  <div
                    key={series[i].name}
                    className="grid grid-cols-[minmax(0,1fr)_4rem] items-center gap-3"
                  >
                    <div className="relative h-2 rounded-full bg-muted">
                      {v != null &&
                        (dots ? (
                          <span
                            className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card"
                            style={{ left: pos(v), background: colourOf(i) }}
                          />
                        ) : (
                          <span
                            className="absolute inset-y-0 rounded-full"
                            style={{
                              left: `${Math.min(zero, frac(v)) * 100}%`,
                              width: `${Math.abs(frac(v) - zero) * 100}%`,
                              background: colourOf(i),
                            }}
                          />
                        ))}
                      {row.reference && (
                        <span
                          aria-hidden
                          className="absolute -inset-y-0.5 w-0.5 -translate-x-1/2 rounded-full bg-foreground/50"
                          style={{ left: pos(row.reference.value) }}
                        />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-right text-sm tabular-nums",
                        best != null &&
                          (v === best
                            ? "font-semibold"
                            : "text-muted-foreground"),
                      )}
                    >
                      {v == null ? "–" : row.format(v)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
