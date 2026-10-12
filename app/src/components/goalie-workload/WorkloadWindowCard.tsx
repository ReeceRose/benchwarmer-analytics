import { AlertTriangle } from "lucide-react";
import { formatSavePct } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { WorkloadWindow } from "@/types";

interface WorkloadWindowCardProps {
  window: WorkloadWindow;
}

export function WorkloadWindowCard({ window }: WorkloadWindowCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3.5 py-3",
        window.isHighWorkload && "border-warning/50 bg-warning/5"
      )}
    >
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        Last {window.days} days
        {window.isHighWorkload && <AlertTriangle className="size-3.5 text-warning" />}
      </div>
      <div className="mt-0.5 font-display text-2xl font-bold tabular-nums">
        {window.gamesPlayed} GP
      </div>
      <dl className="mt-2 space-y-0.5 text-xs">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Games a week</dt>
          <dd className="tabular-nums">{window.gamesPerWeek.toFixed(1)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Shots against</dt>
          <dd className={cn("tabular-nums", window.avgShotsAgainstPerGame > 30 && "text-warning")}>
            {window.avgShotsAgainstPerGame.toFixed(1)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Save %</dt>
          <dd className="tabular-nums">{formatSavePct(window.avgSavePercentage)}</dd>
        </div>
      </dl>
    </div>
  );
}
