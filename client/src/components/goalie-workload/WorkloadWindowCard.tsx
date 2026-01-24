import { AlertTriangle } from "lucide-react";
import { formatSavePct } from "@/lib/formatters";
import type { WorkloadWindow } from "@/types";

interface WorkloadWindowCardProps {
  window: WorkloadWindow;
}

export function WorkloadWindowCard({ window }: WorkloadWindowCardProps) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        window.isHighWorkload
          ? "border-warning/50 bg-warning/5"
          : "border-border"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">
          Last {window.days} days
        </span>
        {window.isHighWorkload && (
          <AlertTriangle className="h-3 w-3 text-warning" />
        )}
      </div>
      <div className="text-xl font-bold">{window.gamesPlayed} GP</div>
      <div className="text-xs text-muted-foreground">
        {window.gamesPerWeek.toFixed(1)} games/week
      </div>
      <div className="mt-2 text-xs">
        <span className="text-muted-foreground">Avg SA: </span>
        <span
          className={window.avgShotsAgainstPerGame > 30 ? "text-warning" : ""}
        >
          {window.avgShotsAgainstPerGame.toFixed(1)}
        </span>
      </div>
      <div className="text-xs">
        <span className="text-muted-foreground">SV%: </span>
        <span>{formatSavePct(window.avgSavePercentage)}</span>
      </div>
    </div>
  );
}
