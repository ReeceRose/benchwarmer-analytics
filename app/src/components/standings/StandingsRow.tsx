import { Link } from "@tanstack/react-router";
import { TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TeamLogo } from "@/components/team-detail/TeamLogo";
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
import type { PlayoffStatus } from "@/lib/playoff";
import type { StandingsWithAnalytics } from "@/types";

export type { PlayoffStatus };

interface StandingsRowProps {
  team: StandingsWithAnalytics;
  analyticsLoading?: boolean;
  season?: number;
  playoffStatus?: PlayoffStatus;
  displayRank?: number;
}

export function StandingsRow({
  team,
  analyticsLoading,
  season,
  playoffStatus,
  displayRank,
}: StandingsRowProps) {
  const analytics = team.analytics;
  const rank = displayRank ?? team.divisionRank;

  // Computed values
  const pointsPct = team.pointPctg ?? (team.gamesPlayed > 0 ? team.points / (team.gamesPlayed * 2) : 0);
  const xGoalDiff = analytics ? analytics.xGoalsFor - analytics.xGoalsAgainst : null;

  // Colors - official stats
  const pointsPctColor = getPointsPctColour(pointsPct);

  // Colors - analytics
  const pdoColor = analytics ? getPdoColour(analytics.pdo) : "";
  const pointsDiffColor = analytics ? getPointsDiffColour(analytics.pointsDiff) : "";
  // Shares arrive as fractions; the colour thresholds are in percent.
  const asPct = (v: number | null | undefined) => (v != null ? v * 100 : null);
  const xgPctColor = analytics ? getXgPctColour(asPct(analytics.xGoalsPct)) : "";
  const corsiColor = analytics ? getCorsiColour(asPct(analytics.corsiPct)) : "";
  const fenwickColor = analytics ? getFenwickColour(asPct(analytics.fenwickPct)) : "";
  const shootingPctColor = analytics ? getShootingPctColour(analytics.shootingPct) : "";
  const savePctColor = analytics ? getSavePctColour(analytics.savePct) : "";
  const xGoalDiffColor = xGoalDiff != null ? getXgDiffColour(xGoalDiff) : "";

  return (
    <TableRow className="group">
      <TableCell className="sticky left-0 z-10 bg-card font-medium text-muted-foreground group-hover:bg-muted">
        <span className="flex items-center gap-2">
          <span>{rank}</span>
          {playoffStatus === "division" && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-success"
              title="Playoff position"
              role="img"
              aria-label="In playoff position"
            />
          )}
          {playoffStatus === "wildcard" && (
            <Badge
              variant="outline"
              className="h-4 px-1.5 text-[9px] font-semibold tracking-wide rounded-full border-chart-4/70 text-chart-4 bg-chart-4/10"
            >
              WC{team.wildcardRank}
            </Badge>
          )}
        </span>
      </TableCell>
      <TableCell className="sticky left-14 z-10 bg-card group-hover:bg-muted">
        <Link
          to="/teams/$abbrev"
          params={{ abbrev: team.abbreviation }}
          search={{ season }}
          className="flex min-w-0 items-center gap-2.5 font-medium hover:text-link"
        >
          <TeamLogo abbrev={team.abbreviation} size="md" />
          <span className="truncate">{team.name}</span>
        </Link>
      </TableCell>
      <TableCell className="border-l text-right tabular-nums">{team.gamesPlayed}</TableCell>
      <TableCell className="text-right tabular-nums">{team.wins}</TableCell>
      <TableCell className="text-right tabular-nums">{team.losses}</TableCell>
      <TableCell className="text-right tabular-nums">{team.otLosses}</TableCell>
      <TableCell className="text-right font-semibold tabular-nums">
        {team.points}
      </TableCell>
      <TableCell className={`text-right tabular-nums ${pointsPctColor}`}>
        {(pointsPct * 100).toFixed(1)}%
      </TableCell>
      <TableCell className="border-l text-right tabular-nums">{team.goalsFor}</TableCell>
      <TableCell className="text-right tabular-nums">{team.goalsAgainst}</TableCell>
      <TableCell
        className={`text-right tabular-nums ${team.goalDifferential >= 0 ? "text-success" : "text-error"}`}
      >
        {team.goalDifferential > 0 ? "+" : ""}
        {team.goalDifferential}
      </TableCell>
      <TableCell className="border-l text-right text-muted-foreground tabular-nums">
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
            <TableCell key={i} className={i === 0 ? "border-l text-right" : "text-right"}>
              <Skeleton className="h-4 w-10 ml-auto" />
            </TableCell>
          ))}
        </>
      ) : analytics ? (
        <>
          <TableCell className="border-l text-right tabular-nums">
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
              ? formatPercent(analytics.xGoalsPct, true)
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
            <TableCell
              key={i}
              className={`text-right text-muted-foreground ${i === 0 ? "border-l" : ""}`}
            >
              -
            </TableCell>
          ))}
        </>
      )}
    </TableRow>
  );
}
