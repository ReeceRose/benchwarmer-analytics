import { Link } from "@tanstack/react-router";
import { TeamTag } from "@/components/shared/TeamTag";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatPositionShort } from "@/lib/formatters";
import { getPlayerHeadshotUrl, getPlayerInitials } from "@/lib/player-headshots";
import type { BreakoutCandidate } from "@/types";

interface CandidateRowProps {
  candidate: BreakoutCandidate;
  rank: number;
}

export function CandidateRow({ candidate, rank }: CandidateRowProps) {
  const corsiColor =
    (candidate.corsiForPct ?? 0.5) >= 0.52
      ? "text-success"
      : (candidate.corsiForPct ?? 0.5) >= 0.48
        ? "text-foreground"
        : "text-error";

  const scoreColor =
    candidate.breakoutScore >= 5
      ? "bg-success/10 text-success border-success/20"
      : candidate.breakoutScore >= 3
        ? "font-semibold"
        : "border-transparent text-muted-foreground";

  return (
    <TableRow>
      <TableCell className="font-medium text-muted-foreground">{rank}</TableCell>
      <TableCell className="sticky left-0 z-10 bg-card">
        <Link
          to="/players/$id"
          params={{ id: String(candidate.playerId) }}
          className="flex items-center gap-2 transition-colors hover:text-link"
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
        <span className="text-muted-foreground">{formatPositionShort(candidate.position)}</span>
      </TableCell>
      <TableCell>
        <TeamTag abbrev={candidate.team} />
      </TableCell>
      <TableCell className="text-right">{candidate.gamesPlayed}</TableCell>
      <TableCell className="text-right">{candidate.goals}</TableCell>
      <TableCell className="text-right">
        {candidate.expectedGoals.toFixed(1)}
      </TableCell>
      <TableCell className="text-right font-medium">
        +{candidate.goalsDifferential.toFixed(1)}
      </TableCell>
      <TableCell className={`text-right ${corsiColor}`}>
        {candidate.corsiForPct != null
          ? `${(candidate.corsiForPct * 100).toFixed(1)}%`
          : "–"}
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
