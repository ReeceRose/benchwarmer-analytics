import { Link } from "@tanstack/react-router";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatPosition, formatToi, formatPercent, formatSavePct } from "@/lib/formatters";
import type { LeaderboardEntry } from "@/types";

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  rank: number;
  isGoalie: boolean;
  highlightedColumn: string;
}

export function LeaderboardRow({
  entry,
  rank,
  isGoalie,
  highlightedColumn,
}: LeaderboardRowProps) {
  const cellClass = (col: string) =>
    `text-right tabular-nums ${highlightedColumn === col ? "bg-muted/30 font-semibold" : ""}`;

  return (
    <TableRow>
      <TableCell className="font-medium text-muted-foreground tabular-nums">
        {rank}
      </TableCell>
      <TableCell>
        <Link
          to="/players/$id"
          params={{ id: String(entry.playerId) }}
          className="hover:underline font-medium"
        >
          {entry.name}
        </Link>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="font-normal">
          {formatPosition(entry.position)}
        </Badge>
      </TableCell>
      <TableCell>
        {entry.team ? (
          <Link
            to="/teams/$abbrev"
            params={{ abbrev: entry.team }}
            className="hover:underline text-muted-foreground"
          >
            {entry.team}
          </Link>
        ) : (
          "-"
        )}
      </TableCell>
      <TableCell className={cellClass("gamesPlayed")}>
        {entry.gamesPlayed}
      </TableCell>
      {!isGoalie ? (
        <>
          <TableCell className={cellClass("points")}>
            {(entry.goals ?? 0) + (entry.assists ?? 0)}
          </TableCell>
          <TableCell className={cellClass("goals")}>
            {entry.goals ?? "-"}
          </TableCell>
          <TableCell className={cellClass("assists")}>
            {entry.assists ?? "-"}
          </TableCell>
          <TableCell className={cellClass("expectedGoals")}>
            {entry.expectedGoals != null ? entry.expectedGoals.toFixed(1) : "-"}
          </TableCell>
          <TableCell className={cellClass("corsiPct")}>
            {entry.corsiForPct != null
              ? formatPercent(entry.corsiForPct, false)
              : "-"}
          </TableCell>
          <TableCell className={cellClass("iceTime")}>
            {entry.iceTimeSeconds != null
              ? formatToi(entry.iceTimeSeconds)
              : "-"}
          </TableCell>
        </>
      ) : (
        <>
          <TableCell className={cellClass("savePct")}>
            {entry.savePercentage != null
              ? formatSavePct(entry.savePercentage)
              : "-"}
          </TableCell>
          <TableCell className={cellClass("gaa")}>
            {entry.goalsAgainstAverage != null
              ? entry.goalsAgainstAverage.toFixed(2)
              : "-"}
          </TableCell>
          <TableCell className={cellClass("gsax")}>
            {entry.goalsSavedAboveExpected != null
              ? entry.goalsSavedAboveExpected >= 0
                ? `+${entry.goalsSavedAboveExpected.toFixed(1)}`
                : entry.goalsSavedAboveExpected.toFixed(1)
              : "-"}
          </TableCell>
          <TableCell className={cellClass("shotsAgainst")}>
            {entry.shotsAgainst ?? "-"}
          </TableCell>
        </>
      )}
    </TableRow>
  );
}
