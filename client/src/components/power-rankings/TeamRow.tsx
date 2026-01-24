import { Link } from "@tanstack/react-router";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatPercent, formatSavePct } from "@/lib/formatters";
import {
  getPdoColour,
  getPointsDiffColour,
  getXgPctColour,
  getCorsiColour,
  getPpPctColour,
  getPkPctColour,
  getGoalDiffColour,
  getPointsPctColour,
  getShootingPctColour,
  getSavePctColour,
  getFenwickColour,
  getXgDiffColour,
} from "@/lib/stat-colours";
import type { TeamPowerRanking } from "@/types";

interface TeamRowProps {
  team: TeamPowerRanking;
  rank: number;
  season?: number;
}

export function TeamRow({ team, rank, season }: TeamRowProps) {
  // Computed values
  const goalDiff = team.goalsFor - team.goalsAgainst;
  const pointsPct = team.gamesPlayed > 0 ? team.points / (team.gamesPlayed * 2) : 0;
  const gfPerGame = team.gamesPlayed > 0 ? team.goalsFor / team.gamesPlayed : 0;
  const gaPerGame = team.gamesPlayed > 0 ? team.goalsAgainst / team.gamesPlayed : 0;
  const xGoalDiff = team.xGoalsFor - team.xGoalsAgainst;

  // Colors
  const goalDiffColor = getGoalDiffColour(goalDiff);
  const pointsPctColor = getPointsPctColour(pointsPct);
  const xGoalDiffColor = getXgDiffColour(xGoalDiff);
  const pdoColor = getPdoColour(team.pdo);
  const pointsDiffColor = getPointsDiffColour(team.pointsDiff);
  const xgPctColor = getXgPctColour(team.xGoalsPct != null ? team.xGoalsPct * 100 : null);
  const corsiColor = getCorsiColour(team.corsiPct != null ? team.corsiPct * 100 : null);
  const fenwickColor = getFenwickColour(team.fenwickPct != null ? team.fenwickPct * 100 : null);
  const shootingPctColor = getShootingPctColour(team.shootingPct);
  const savePctColor = getSavePctColour(team.savePct);
  const ppPctColor = getPpPctColour(team.ppPct);
  const pkPctColor = getPkPctColour(team.pkPct);

  return (
    <TableRow>
      <TableCell className="font-medium text-muted-foreground">{rank}</TableCell>
      <TableCell>
        <Link
          to="/teams/$abbrev"
          params={{ abbrev: team.abbreviation }}
          search={{ season }}
          className="hover:underline font-medium"
        >
          {team.name}
        </Link>
        <span className="text-muted-foreground text-xs ml-2">
          {team.abbreviation}
        </span>
      </TableCell>
      <TableCell className="text-right">{team.gamesPlayed}</TableCell>
      <TableCell className="text-right">{team.wins}</TableCell>
      <TableCell className="text-right">{team.losses}</TableCell>
      <TableCell className="text-right">{team.otLosses}</TableCell>
      <TableCell className="text-right font-semibold">{team.points}</TableCell>
      <TableCell className={`text-right ${pointsPctColor}`}>
        {(pointsPct * 100).toFixed(1)}%
      </TableCell>
      <TableCell className="text-right">{team.goalsFor}</TableCell>
      <TableCell className="text-right">{team.goalsAgainst}</TableCell>
      <TableCell className={`text-right font-medium ${goalDiffColor}`}>
        {goalDiff > 0 ? "+" : ""}{goalDiff}
      </TableCell>
      <TableCell className="text-right">{gfPerGame.toFixed(2)}</TableCell>
      <TableCell className="text-right">{gaPerGame.toFixed(2)}</TableCell>
      <TableCell className="text-right">{team.xGoalsFor.toFixed(1)}</TableCell>
      <TableCell className="text-right">{team.xGoalsAgainst.toFixed(1)}</TableCell>
      <TableCell className={`text-right font-medium ${xGoalDiffColor}`}>
        {xGoalDiff > 0 ? "+" : ""}{xGoalDiff.toFixed(1)}
      </TableCell>
      <TableCell className="text-right">{team.expectedPoints.toFixed(0)}</TableCell>
      <TableCell className={`text-right ${ppPctColor}`}>
        {team.ppPct != null ? `${team.ppPct.toFixed(1)}%` : "-"}
      </TableCell>
      <TableCell className={`text-right ${pkPctColor}`}>
        {team.pkPct != null ? `${team.pkPct.toFixed(1)}%` : "-"}
      </TableCell>
      <TableCell className={`text-right ${xgPctColor}`}>
        {team.xGoalsPct != null ? formatPercent(team.xGoalsPct) : "-"}
      </TableCell>
      <TableCell className={`text-right ${corsiColor}`}>
        {team.corsiPct != null ? formatPercent(team.corsiPct) : "-"}
      </TableCell>
      <TableCell className={`text-right ${fenwickColor}`}>
        {team.fenwickPct != null ? formatPercent(team.fenwickPct) : "-"}
      </TableCell>
      <TableCell className={`text-right ${shootingPctColor}`}>
        {team.shootingPct != null ? `${team.shootingPct.toFixed(1)}%` : "-"}
      </TableCell>
      <TableCell className={`text-right ${savePctColor}`}>
        {formatSavePct(team.savePct != null ? team.savePct / 100 : null)}
      </TableCell>
      <TableCell className={`text-right font-medium ${pdoColor}`}>
        {team.pdo != null ? team.pdo.toFixed(1) : "-"}
      </TableCell>
      <TableCell className={`text-right font-medium ${pointsDiffColor}`}>
        {team.pointsDiff > 0 ? "+" : ""}
        {team.pointsDiff}
      </TableCell>
    </TableRow>
  );
}
