import { Link } from "@tanstack/react-router";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatPercent } from "@/lib/formatters";
import {
  getPdoColor,
  getPointsDiffColor,
  getXgPctColor,
  getCorsiColor,
} from "@/lib/stat-colors";
import type { TeamPowerRanking } from "@/types";

interface TeamRowProps {
  team: TeamPowerRanking;
  rank: number;
  season?: number;
}

export function TeamRow({ team, rank, season }: TeamRowProps) {
  const pdoColor = getPdoColor(team.pdo);
  const pointsDiffColor = getPointsDiffColor(team.pointsDiff);
  const xgPctColor = getXgPctColor(team.xGoalsPct);
  const corsiColor = getCorsiColor(team.corsiPct);

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
      <TableCell className="text-right">{team.goalsFor}</TableCell>
      <TableCell className="text-right">{team.goalsAgainst}</TableCell>
      <TableCell className={`text-right ${xgPctColor}`}>
        {team.xGoalsPct != null ? formatPercent(team.xGoalsPct, false) : "-"}
      </TableCell>
      <TableCell className={`text-right ${corsiColor}`}>
        {team.corsiPct != null ? formatPercent(team.corsiPct, false) : "-"}
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
