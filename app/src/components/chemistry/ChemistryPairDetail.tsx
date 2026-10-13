import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { formatIceTimeLong } from "@/lib/formatters";
import { getCorsiColour, getXgPctColour } from "@/lib/stat-colours";
import { cn } from "@/lib/utils";
import type { ChemistryPair } from "@/types";

function Stat({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("font-display text-lg font-bold tabular-nums", className)}>{value}</div>
    </div>
  );
}

/** The pair picked in the grid or the ranked list. */
export function ChemistryPairDetail({ pair, onClose }: { pair: ChemistryPair; onClose: () => void }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-medium">
          <Link to="/players/$id" params={{ id: String(pair.player1Id) }} className="hover:text-link">
            {pair.player1Name}
          </Link>
          <span className="text-muted-foreground"> and </span>
          <Link to="/players/$id" params={{ id: String(pair.player2Id) }} className="hover:text-link">
            {pair.player2Name}
          </Link>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Clear selected pair"
          className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-5">
        <Stat
          label="xG share"
          value={pair.expectedGoalsPct != null ? `${pair.expectedGoalsPct.toFixed(1)}%` : "–"}
          className={getXgPctColour(pair.expectedGoalsPct)}
        />
        <Stat
          label="Shot share (CF%)"
          value={pair.corsiPct != null ? `${pair.corsiPct.toFixed(1)}%` : "–"}
          className={getCorsiColour(pair.corsiPct)}
        />
        <Stat label="Goals" value={`${pair.goalsFor}–${pair.goalsAgainst}`} />
        <Stat label="Together" value={formatIceTimeLong(pair.totalIceTimeSeconds)} />
        <Stat label="Games" value={pair.gamesPlayed} />
      </div>
    </div>
  );
}
