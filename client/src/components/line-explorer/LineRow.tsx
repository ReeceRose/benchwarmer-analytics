import { ChevronDown, ChevronUp } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlayerChip } from "@/components/shared";
import { formatToi, formatPercent } from "@/lib/formatters";
import type { LineCombination } from "@/types";
import { cn } from "@/lib/utils";

interface LineRowProps {
  line: LineCombination;
  isExpanded: boolean;
  onToggleExpand: () => void;
  teamAvgXgPct?: number;
  teamAvgCfPct?: number;
}

function getColorClass(value: number | undefined, avg: number | undefined): string {
  if (value === undefined || avg === undefined) return "";
  const diff = value - avg;
  if (diff > 2) return "text-green-600 dark:text-green-400";
  if (diff < -2) return "text-red-600 dark:text-red-400";
  return "";
}

export function LineRow({
  line,
  isExpanded,
  onToggleExpand,
  teamAvgXgPct,
  teamAvgCfPct,
}: LineRowProps) {
  const xgPct = line.expectedGoalsPct != null ? line.expectedGoalsPct * 100 : undefined;
  const cfPct = line.corsiPct != null ? line.corsiPct * 100 : undefined;

  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell>
        <div className="flex flex-wrap items-center gap-1.5">
          <PlayerChip
            playerId={line.player1.id}
            name={line.player1.name}
            position={line.player1.position}
            size="sm"
          />
          <PlayerChip
            playerId={line.player2.id}
            name={line.player2.name}
            position={line.player2.position}
            size="sm"
          />
          {line.player3 && (
            <PlayerChip
              playerId={line.player3.id}
              name={line.player3.name}
              position={line.player3.position}
              size="sm"
            />
          )}
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {line.gamesPlayed}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatToi(line.iceTimeSeconds)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {line.goalsFor}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {line.goalsAgainst}
      </TableCell>
      <TableCell className={cn("text-right tabular-nums font-medium", getColorClass(xgPct, teamAvgXgPct))}>
        {xgPct != null ? formatPercent(xgPct, false) : "-"}
      </TableCell>
      <TableCell className={cn("text-right tabular-nums", getColorClass(cfPct, teamAvgCfPct))}>
        {cfPct != null ? formatPercent(cfPct, false) : "-"}
      </TableCell>
      <TableCell className="w-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onToggleExpand}
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </TableCell>
    </TableRow>
  );
}
