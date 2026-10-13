import { Swatch } from "@/components/game-live/parts";
import { cn } from "@/lib/utils";

export interface LegendItem {
  label: string;
  colour: string;
  /** Draw a dashed line instead of a swatch (expected or reference series). */
  dashed?: boolean;
}

/** The standard legend row: swatches and muted labels, above or below a chart. */
export function ChartLegend({ items, className }: { items: LegendItem[]; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground", className)}>
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          {item.dashed ? (
            <svg width={16} height={10} aria-hidden>
              <line x1={0} x2={16} y1={5} y2={5} stroke={item.colour} strokeWidth={2} strokeDasharray="4 3" />
            </svg>
          ) : (
            <Swatch colour={item.colour} />
          )}
          {item.label}
        </span>
      ))}
    </div>
  );
}
