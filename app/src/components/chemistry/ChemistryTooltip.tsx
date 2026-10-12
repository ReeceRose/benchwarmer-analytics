import { formatToi, formatPercent } from "@/lib/formatters";
import type { ChemistryPair } from "@/types";

interface ChemistryTooltipProps {
  pair: ChemistryPair;
  position: { x: number; y: number };
}

export function ChemistryTooltip({ pair, position }: ChemistryTooltipProps) {
  return (
    <div
      className="absolute rounded-xl border bg-popover text-popover-foreground shadow-lg shadow-black/5 p-3 min-w-50 z-10 pointer-events-none"
      style={{ left: position.x + 12, top: position.y + 12 }}
    >
      <div className="font-medium mb-2">
        {pair.player1Name} + {pair.player2Name}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <span className="text-muted-foreground">xG%:</span>
        <span className="tabular-nums">
          {pair.expectedGoalsPct != null
            ? formatPercent(pair.expectedGoalsPct, true)
            : "-"}
        </span>
        <span className="text-muted-foreground">CF%:</span>
        <span className="tabular-nums">
          {pair.corsiPct != null
            ? formatPercent(pair.corsiPct, true)
            : "-"}
        </span>
        <span className="text-muted-foreground">TOI:</span>
        <span className="tabular-nums">
          {formatToi(pair.totalIceTimeSeconds)}
        </span>
        <span className="text-muted-foreground">GP:</span>
        <span className="tabular-nums">{pair.gamesPlayed}</span>
        <span className="text-muted-foreground">GF/GA:</span>
        <span className="tabular-nums">
          {pair.goalsFor}/{pair.goalsAgainst}
        </span>
      </div>
    </div>
  );
}
