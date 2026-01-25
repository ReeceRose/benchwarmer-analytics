import { Link } from "@tanstack/react-router";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatPosition } from "@/lib/formatters";
import { getPlayerHeadshotUrl, getPlayerInitials } from "@/lib/player-headshots";
import type { BreakoutCandidate } from "@/types";

interface CandidateRowProps {
  candidate: BreakoutCandidate;
  rank: number;
}

export function CandidateRow({ candidate, rank }: CandidateRowProps) {
  const diffColor =
    candidate.goalsDifferential > 2
      ? "text-error"
      : candidate.goalsDifferential > 0
        ? "text-warning"
        : "text-success";

  const corsiColor =
    (candidate.corsiForPct ?? 50) >= 52
      ? "text-success"
      : (candidate.corsiForPct ?? 50) >= 48
        ? "text-foreground"
        : "text-error";

  const scoreColor =
    candidate.breakoutScore >= 5
      ? "bg-success/10 text-success border-success/20"
      : candidate.breakoutScore >= 3
        ? "bg-warning/10 text-warning border-warning/20"
        : "bg-muted";

  return (
    <TableRow>
      <TableCell className="font-medium text-muted-foreground">{rank}</TableCell>
      <TableCell>
        <Link
          to="/players/$id"
          params={{ id: String(candidate.playerId) }}
          className="flex items-center gap-2 hover:underline"
        >
          <Avatar className="h-6 w-6">
            <AvatarImage
              src={getPlayerHeadshotUrl(candidate.playerId, candidate.team)}
              alt={candidate.name}
            />
            <AvatarFallback className="text-[10px]">
              {getPlayerInitials(candidate.name)}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{candidate.name}</span>
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
