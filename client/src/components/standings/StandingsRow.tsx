import { Link } from "@tanstack/react-router";
import { TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPercent, formatSavePct } from "@/lib/formatters";
import {
  getPdoColour,
  getPointsDiffColour,
  getXgPctColour,
  getCorsiColour,
  getPointsPctColour,
  getFenwickColour,
  getShootingPctColour,
  getSavePctColour,
  getXgDiffColour,
} from "@/lib/stat-colours";
import type { StandingsWithAnalytics } from "@/types";

interface StandingsRowProps {
  team: StandingsWithAnalytics;
  analyticsLoading?: boolean;
}

export function StandingsRow({ team, analyticsLoading }: StandingsRowProps) {
  const analytics = team.analytics;

  // Computed values
  const pointsPct = team.pointPctg ?? (team.gamesPlayed > 0 ? team.points / (team.gamesPlayed * 2) : 0);
  const xGoalDiff = analytics ? analytics.xGoalsFor - analytics.xGoalsAgainst : null;

  // Colors - official stats
  const pointsPctColor = getPointsPctColour(pointsPct);

  // Colors - analytics
  const pdoColor = analytics ? getPdoColour(analytics.pdo) : "";
  const pointsDiffColor = analytics ? getPointsDiffColour(analytics.pointsDiff) : "";
  const xgPctColor = analytics ? getXgPctColour(analytics.xGoalsPct) : "";
  const corsiColor = analytics ? getCorsiColour(analytics.corsiPct) : "";
  const fenwickColor = analytics ? getFenwickColour(analytics.fenwickPct) : "";
  const shootingPctColor = analytics ? getShootingPctColour(analytics.shootingPct) : "";
  const savePctColor = analytics ? getSavePctColour(analytics.savePct) : "";
  const xGoalDiffColor = xGoalDiff != null ? getXgDiffColour(xGoalDiff) : "";

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
      <TableCell className={`text-right tabular-nums ${pointsPctColor}`}>
        {(pointsPct * 100).toFixed(1)}%
      </TableCell>
      <TableCell className="text-right tabular-nums">{team.goalsFor}</TableCell>
      <TableCell className="text-right tabular-nums">{team.goalsAgainst}</TableCell>
      <TableCell
        className={`text-right tabular-nums ${team.goalDifferential >= 0 ? "text-success" : "text-error"}`}
      >
        {team.goalDifferential > 0 ? "+" : ""}
        {team.goalDifferential}
      </TableCell>
      <TableCell className="text-right text-muted-foreground tabular-nums">
        {team.homeRecord}
      </TableCell>
      <TableCell className="text-right text-muted-foreground tabular-nums">
        {team.awayRecord}
      </TableCell>
      <TableCell className="text-right text-muted-foreground tabular-nums">
        {team.last10Record}
      </TableCell>
      <TableCell className="text-right">
        {team.streak ? (
          <span
            className={
              team.streak.startsWith("W")
                ? "text-success"
                : team.streak.startsWith("L")
                  ? "text-error"
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
          {[...Array(11)].map((_, i) => (
            <TableCell key={i} className="text-right">
              <Skeleton className="h-4 w-10 ml-auto" />
            </TableCell>
          ))}
        </>
      ) : analytics ? (
        <>
          <TableCell className="text-right tabular-nums">
            {analytics.xGoalsFor.toFixed(1)}
          </TableCell>
          <TableCell className="text-right tabular-nums">
            {analytics.xGoalsAgainst.toFixed(1)}
          </TableCell>
          <TableCell className={`text-right tabular-nums font-medium ${xGoalDiffColor}`}>
            {xGoalDiff != null && xGoalDiff > 0 ? "+" : ""}
            {xGoalDiff?.toFixed(1) ?? "-"}
          </TableCell>
          <TableCell className="text-right tabular-nums">
            {analytics.expectedPoints.toFixed(0)}
          </TableCell>
          <TableCell className={`text-right tabular-nums ${xgPctColor}`}>
            {analytics.xGoalsPct != null
              ? formatPercent(analytics.xGoalsPct, false)
              : "-"}
          </TableCell>
          <TableCell className={`text-right tabular-nums ${corsiColor}`}>
            {analytics.corsiPct != null
              ? formatPercent(analytics.corsiPct, true)
              : "-"}
          </TableCell>
          <TableCell className={`text-right tabular-nums ${fenwickColor}`}>
            {analytics.fenwickPct != null
              ? formatPercent(analytics.fenwickPct, true)
              : "-"}
          </TableCell>
          <TableCell className={`text-right tabular-nums ${shootingPctColor}`}>
            {analytics.shootingPct != null
              ? `${analytics.shootingPct.toFixed(1)}%`
              : "-"}
          </TableCell>
          <TableCell className={`text-right tabular-nums ${savePctColor}`}>
            {formatSavePct(analytics.savePct != null ? analytics.savePct / 100 : null)}
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
          {[...Array(11)].map((_, i) => (
            <TableCell key={i} className="text-right text-muted-foreground">-</TableCell>
          ))}
        </>
      )}
    </TableRow>
  );
}
