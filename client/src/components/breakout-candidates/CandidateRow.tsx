import { Link } from "@tanstack/react-router";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatPosition } from "@/lib/formatters";
import type { BreakoutCandidate } from "@/types";

interface CandidateRowProps {
  candidate: BreakoutCandidate;
  rank: number;
}

export function CandidateRow({ candidate, rank }: CandidateRowProps) {
  const diffColor =
    candidate.goalsDifferential > 2
      ? "text-red-500"
      : candidate.goalsDifferential > 0
        ? "text-orange-500"
        : "text-green-500";

  const corsiColor =
    (candidate.corsiForPct ?? 50) >= 52
      ? "text-green-500"
      : (candidate.corsiForPct ?? 50) >= 48
        ? "text-foreground"
        : "text-red-500";

  const scoreColor =
    candidate.breakoutScore >= 5
      ? "bg-green-500/10 text-green-600 border-green-500/20"
      : candidate.breakoutScore >= 3
        ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
        : "bg-muted";

  return (
    <TableRow>
      <TableCell className="font-medium text-muted-foreground">{rank}</TableCell>
      <TableCell>
        <Link
          to="/players/$id"
          params={{ id: String(candidate.playerId) }}
          className="hover:underline font-medium"
        >
          {candidate.name}
        </Link>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="font-normal">
          {formatPosition(candidate.position)}
        </Badge>
      </TableCell>
      <TableCell>
        <Link
          to="/teams/$abbrev"
          params={{ abbrev: candidate.team }}
          className="hover:underline text-muted-foreground"
        >
          {candidate.team}
        </Link>
      </TableCell>
      <TableCell className="text-right">{candidate.gamesPlayed}</TableCell>
      <TableCell className="text-right">{candidate.goals}</TableCell>
      <TableCell className="text-right">
        {candidate.expectedGoals.toFixed(1)}
      </TableCell>
      <TableCell className={`text-right font-medium ${diffColor}`}>
        +{candidate.goalsDifferential.toFixed(1)}
      </TableCell>
      <TableCell className={`text-right ${corsiColor}`}>
        {candidate.corsiForPct?.toFixed(1) ?? "-"}%
      </TableCell>
      <TableCell className="text-right">
        {candidate.shotsPer60.toFixed(1)}
      </TableCell>
      <TableCell className="text-right">
        <Badge variant="outline" className={scoreColor}>
          {candidate.breakoutScore.toFixed(1)}
        </Badge>
      </TableCell>
    </TableRow>
  );
}
