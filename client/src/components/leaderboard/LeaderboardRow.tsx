import { Link } from "@tanstack/react-router";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  formatPosition,
  formatToi,
  formatPercent,
  formatSavePct,
} from "@/lib/formatters";
import { getPlayerHeadshotUrl, getPlayerInitials } from "@/lib/player-headshots";
import type { LeaderboardEntry } from "@/types";

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  rank: number;
  season: number;
  isGoalie: boolean;
  highlightedColumn: string;
}

export function LeaderboardRow({
  entry,
  rank,
  season,
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
          className="flex items-center gap-2 hover:underline"
        >
          <Avatar className="h-6 w-6">
            <AvatarImage
              src={getPlayerHeadshotUrl(entry.playerId, entry.team)}
              alt={entry.name}
            />
            <AvatarFallback className="text-[10px]">
              {getPlayerInitials(entry.name)}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{entry.name}</span>
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
            search={{ season: season }}
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
          <TableCell className={cellClass("shots")}>
            {entry.shots ?? "-"}
          </TableCell>
          <TableCell className={cellClass("expectedGoals")}>
            {entry.expectedGoals != null ? entry.expectedGoals.toFixed(1) : "-"}
          </TableCell>
          <TableCell className={cellClass("xgPer60")}>
            {entry.expectedGoalsPer60 != null
              ? entry.expectedGoalsPer60.toFixed(2)
              : "-"}
          </TableCell>
          <TableCell className={cellClass("corsiPct")}>
            {entry.corsiForPct != null
              ? formatPercent(entry.corsiForPct)
              : "-"}
          </TableCell>
          <TableCell className={cellClass("fenwickPct")}>
            {entry.fenwickForPct != null
              ? formatPercent(entry.fenwickForPct)
              : "-"}
          </TableCell>
          <TableCell className={cellClass("oiShPct")}>
            {entry.onIceShootingPct != null
              ? formatPercent(entry.onIceShootingPct)
              : "-"}
          </TableCell>
          <TableCell className={cellClass("oiSvPct")}>
            {entry.onIceSavePct != null
              ? formatPercent(entry.onIceSavePct)
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
          <TableCell className={cellClass("goalieTime")}>
            {entry.goalieIceTimeSeconds != null
              ? formatToi(entry.goalieIceTimeSeconds)
              : "-"}
          </TableCell>
          <TableCell className={cellClass("goalsAgainst")}>
            {entry.goalsAgainst ?? "-"}
          </TableCell>
          <TableCell className={cellClass("xga")}>
            {entry.expectedGoalsAgainst != null
              ? entry.expectedGoalsAgainst.toFixed(1)
              : "-"}
          </TableCell>
          <TableCell className={cellClass("hdSv")}>
            {entry.highDangerShots != null && entry.highDangerGoals != null
              ? formatSavePct(
                  (entry.highDangerShots - entry.highDangerGoals) /
                    entry.highDangerShots,
                )
              : "-"}
          </TableCell>
        </>
      )}
    </TableRow>
  );
}
