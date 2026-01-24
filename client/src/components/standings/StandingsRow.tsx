import { Link } from "@tanstack/react-router";
import { TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPercent } from "@/lib/formatters";
import {
  getPdoColor,
  getPointsDiffColor,
  getXgPctColor,
  getCorsiColor,
} from "@/lib/stat-colors";
import type { StandingsWithAnalytics } from "@/types";

interface StandingsRowProps {
  team: StandingsWithAnalytics;
  analyticsLoading?: boolean;
}

export function StandingsRow({ team, analyticsLoading }: StandingsRowProps) {
  const analytics = team.analytics;
  const pdoColor = analytics ? getPdoColor(analytics.pdo) : "";
  const pointsDiffColor = analytics
    ? getPointsDiffColor(analytics.pointsDiff)
    : "";
  const xgPctColor = analytics ? getXgPctColor(analytics.xGoalsPct) : "";
  const corsiColor = analytics ? getCorsiColor(analytics.corsiPct) : "";

  return (
    <TableRow>
      <TableCell className="font-medium text-muted-foreground">
        {team.divisionRank}
      </TableCell>
      <TableCell>
        <Link
          to="/teams/$abbrev"
          params={{ abbrev: team.abbreviation }}
          className="hover:underline font-medium"
        >
          {team.name}
        </Link>
        <span className="text-muted-foreground text-xs ml-2">
          {team.abbreviation}
        </span>
      </TableCell>
      <TableCell className="text-right tabular-nums">{team.gamesPlayed}</TableCell>
      <TableCell className="text-right tabular-nums">{team.wins}</TableCell>
      <TableCell className="text-right tabular-nums">{team.losses}</TableCell>
      <TableCell className="text-right tabular-nums">{team.otLosses}</TableCell>
      <TableCell className="text-right font-semibold tabular-nums">
        {team.points}
      </TableCell>
      <TableCell className="text-right tabular-nums">{team.goalsFor}</TableCell>
      <TableCell className="text-right tabular-nums">{team.goalsAgainst}</TableCell>
      <TableCell
        className={`text-right tabular-nums ${team.goalDifferential >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
      >
        {team.goalDifferential > 0 ? "+" : ""}
        {team.goalDifferential}
      </TableCell>
      <TableCell className="text-right text-muted-foreground tabular-nums">
        {team.last10Record}
      </TableCell>
      <TableCell className="text-right">
        {team.streak ? (
          <span
            className={
              team.streak.startsWith("W")
                ? "text-green-600 dark:text-green-400"
                : team.streak.startsWith("L")
                  ? "text-red-600 dark:text-red-400"
                  : "text-muted-foreground"
            }
          >
            {team.streak}
          </span>
        ) : (
          "-"
        )}
      </TableCell>
      {analyticsLoading ? (
        <>
          <TableCell className="text-right">
            <Skeleton className="h-4 w-10 ml-auto" />
          </TableCell>
          <TableCell className="text-right">
            <Skeleton className="h-4 w-10 ml-auto" />
          </TableCell>
          <TableCell className="text-right">
            <Skeleton className="h-4 w-10 ml-auto" />
          </TableCell>
          <TableCell className="text-right">
            <Skeleton className="h-4 w-8 ml-auto" />
          </TableCell>
        </>
      ) : analytics ? (
        <>
          <TableCell className={`text-right tabular-nums ${xgPctColor}`}>
            {analytics.xGoalsPct != null
              ? formatPercent(analytics.xGoalsPct, false)
              : "-"}
          </TableCell>
          <TableCell className={`text-right tabular-nums ${corsiColor}`}>
            {analytics.corsiPct != null
              ? formatPercent(analytics.corsiPct, false)
              : "-"}
          </TableCell>
          <TableCell className={`text-right tabular-nums font-medium ${pdoColor}`}>
            {analytics.pdo != null ? analytics.pdo.toFixed(1) : "-"}
          </TableCell>
          <TableCell
            className={`text-right tabular-nums font-medium ${pointsDiffColor}`}
          >
            {analytics.pointsDiff > 0 ? "+" : ""}
            {analytics.pointsDiff}
          </TableCell>
        </>
      ) : (
        <>
          <TableCell className="text-right text-muted-foreground">-</TableCell>
          <TableCell className="text-right text-muted-foreground">-</TableCell>
          <TableCell className="text-right text-muted-foreground">-</TableCell>
          <TableCell className="text-right text-muted-foreground">-</TableCell>
        </>
      )}
    </TableRow>
  );
}
