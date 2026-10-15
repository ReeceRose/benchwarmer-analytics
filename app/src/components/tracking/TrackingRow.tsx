import type { ReactNode } from "react";
import { standing } from "@/components/tracking/tracking-format";
import { formatOrdinal } from "@/lib/formatters";
import { getPercentileBarClass, getPercentileColour } from "@/lib/stat-colours";
import { cn } from "@/lib/utils";
import type { TrackingMetric } from "@/types";

/**
 * One tracked stat: label, value, league average and a bar to its league
 * percentile (players) or rank (teams). The tick marks the league median.
 */
export function TrackingRow({
  label,
  metric,
  format,
  note,
}: {
  label: string;
  metric: TrackingMetric;
  format: (value: number) => string;
  /** Extra muted line under the label (e.g. when a peak happened). */
  note?: ReactNode;
}) {
  const pctl = standing(metric);
  const badge = metric.rank != null ? formatOrdinal(metric.rank) : pctl != null ? formatOrdinal(pctl) : "–";
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-3">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm tabular-nums">{metric.value != null ? format(metric.value) : "–"}</span>
        <span
          className={cn("ml-auto font-display text-lg font-bold tabular-nums", getPercentileColour(pctl))}
          title={metric.rank != null ? "League rank" : "League percentile"}
        >
          {badge}
        </span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full", getPercentileBarClass(pctl))}
          style={{ width: `${pctl != null ? Math.max(2, Math.min(100, pctl)) : 0}%` }}
        />
        <div className="absolute inset-y-0 left-1/2 w-px bg-foreground/20" />
      </div>
      <div className="flex flex-wrap justify-between gap-x-3 text-xs text-muted-foreground">
        <span>{note}</span>
        {metric.leagueAverage != null && <span className="tabular-nums">League avg {format(metric.leagueAverage)}</span>}
      </div>
    </div>
  );
}
