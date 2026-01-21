import { Link } from "@tanstack/react-router";
import { Calendar, Ruler, Weight, Target } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  formatPosition,
  formatHeight,
  formatWeight,
  formatDate,
} from "@/lib/formatters";
import type { PlayerDetail, Team } from "@/types";

interface PlayerHeaderProps {
  player: PlayerDetail;
  teams?: Team[];
  isGoalie: boolean;
}

export function PlayerHeader({ player, teams, isGoalie }: PlayerHeaderProps) {
  const initials = player.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2);

  const getTeamName = (abbrev: string): string => {
    const team = teams?.find((t: Team) => t.abbreviation === abbrev);
    return team?.name ?? abbrev;
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <Avatar className="h-20 w-20 shrink-0">
        <AvatarImage src={player.headshotUrl} alt={player.name} />
        <AvatarFallback className="text-xl">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold tracking-tight">{player.name}</h1>
          {player.position && (
            <Badge variant="secondary">{formatPosition(player.position)}</Badge>
          )}
        </div>
        {player.currentTeamAbbreviation && (
          <Link
            to="/teams/$abbrev"
            params={{ abbrev: player.currentTeamAbbreviation }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {getTeamName(player.currentTeamAbbreviation)}
          </Link>
        )}
        <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
          {player.birthDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDate(player.birthDate)}</span>
            </div>
          )}
          {player.heightInches && (
            <div className="flex items-center gap-1.5">
              <Ruler className="h-3.5 w-3.5" />
              <span>{formatHeight(player.heightInches)}</span>
            </div>
          )}
          {player.weightLbs && (
            <div className="flex items-center gap-1.5">
              <Weight className="h-3.5 w-3.5" />
              <span>{formatWeight(player.weightLbs)}</span>
            </div>
          )}
          {player.shoots && (
            <div className="flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" />
              <span>{isGoalie ? "Catches" : "Shoots"} {player.shoots}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
