import { Link } from "@tanstack/react-router";
import { TeamTag } from "@/components/shared/TeamTag";
import { TableCell, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  formatToi,
  formatPercent,
  formatSavePct,
  formatPositionShort,
} from "@/lib/formatters";
import { getPlayerHeadshotUrl, getPlayerInitials } from "@/lib/player-headshots";
import type { LeaderboardEntry } from "@/types";

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  rank: number;
  season: number;
  isGoalie: boolean;
  showGameScore: boolean;
  highlightedColumn: string;
}

export function LeaderboardRow({
  entry,
  rank,
  season,
  isGoalie,
  showGameScore,
  highlightedColumn,
}: LeaderboardRowProps) {
  const cellClass = (col: string) =>
    `text-right tabular-nums ${highlightedColumn === col ? "bg-accent/40 font-semibold" : ""}`;

  return (
    <TableRow>
      <TableCell className="font-medium text-muted-foreground tabular-nums">
        {rank}
      </TableCell>
      <TableCell>
        <Link
          to="/players/$id"
          params={{ id: String(entry.playerId) }}
          className="flex items-center gap-2 transition-colors hover:text-link"
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
        <span className="text-muted-foreground">{formatPositionShort(entry.position)}</span>
      </TableCell>
      <TableCell>
        {entry.team ? (
          <TeamTag abbrev={entry.team} season={season} />
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
          {showGameScore && (
            <TableCell className={cellClass("gameScore")}>
              {entry.gameScorePerGame != null
                ? entry.gameScorePerGame.toFixed(2)
                : "–"}
            </TableCell>
          )}
          <TableCell className={cellClass("goals")}>
            {entry.goals ?? "–"}
          </TableCell>
          <TableCell className={cellClass("assists")}>
            {entry.assists ?? "–"}
          </TableCell>
          <TableCell className={cellClass("shots")}>
            {entry.shots ?? "–"}
          </TableCell>
          <TableCell className={cellClass("expectedGoals")}>
            {entry.expectedGoals != null ? entry.expectedGoals.toFixed(1) : "–"}
          </TableCell>
          <TableCell className={cellClass("xgPer60")}>
            {entry.expectedGoalsPer60 != null
              ? entry.expectedGoalsPer60.toFixed(2)
              : "–"}
          </TableCell>
          <TableCell className={cellClass("corsiPct")}>
            {entry.corsiForPct != null
              ? formatPercent(entry.corsiForPct)
              : "–"}
          </TableCell>
          <TableCell className={cellClass("fenwickPct")}>
            {entry.fenwickForPct != null
              ? formatPercent(entry.fenwickForPct)
              : "–"}
          </TableCell>
          <TableCell className={cellClass("oiShPct")}>
            {entry.onIceShootingPct != null
              ? formatPercent(entry.onIceShootingPct)
              : "–"}
          </TableCell>
          <TableCell className={cellClass("oiSvPct")}>
            {entry.onIceSavePct != null
              ? formatPercent(entry.onIceSavePct)
              : "–"}
          </TableCell>
          <TableCell className={cellClass("iceTime")}>
            {entry.iceTimeSeconds != null
              ? formatToi(entry.iceTimeSeconds)
              : "–"}
          </TableCell>
          <TableCell className={cellClass("faceoffPct")}>
            {entry.faceoffPct != null
              ? `${entry.faceoffPct.toFixed(1)}%`
              : "–"}
          </TableCell>
        </>
      ) : (
        <>
          <TableCell className={cellClass("savePct")}>
            {entry.savePercentage != null
              ? formatSavePct(entry.savePercentage)
              : "–"}
          </TableCell>
          <TableCell className={cellClass("gaa")}>
            {entry.goalsAgainstAverage != null
              ? entry.goalsAgainstAverage.toFixed(2)
              : "–"}
          </TableCell>
          <TableCell className={cellClass("gsax")}>
            {entry.goalsSavedAboveExpected != null
              ? entry.goalsSavedAboveExpected >= 0
                ? `+${entry.goalsSavedAboveExpected.toFixed(1)}`
                : entry.goalsSavedAboveExpected.toFixed(1)
              : "–"}
          </TableCell>
          <TableCell className={cellClass("shotsAgainst")}>
            {entry.shotsAgainst ?? "–"}
          </TableCell>
          <TableCell className={cellClass("goalieTime")}>
            {entry.goalieIceTimeSeconds != null
              ? formatToi(entry.goalieIceTimeSeconds)
              : "–"}
          </TableCell>
          <TableCell className={cellClass("goalsAgainst")}>
            {entry.goalsAgainst ?? "–"}
          </TableCell>
          <TableCell className={cellClass("xga")}>
            {entry.expectedGoalsAgainst != null
              ? entry.expectedGoalsAgainst.toFixed(1)
              : "–"}
          </TableCell>
          <TableCell className={cellClass("hdSv")}>
            {entry.highDangerShots != null && entry.highDangerGoals != null
              ? formatSavePct(
                  (entry.highDangerShots - entry.highDangerGoals) /
                    entry.highDangerShots,
                )
              : "–"}
          </TableCell>
          <TableCell className={cellClass("reboundControl")}>
            {entry.rebounds != null && entry.expectedRebounds != null && entry.expectedRebounds > 0
              ? (entry.rebounds / entry.expectedRebounds).toFixed(2) + "x"
              : "–"}
          </TableCell>
        </>
      )}
    </TableRow>
  );
}
