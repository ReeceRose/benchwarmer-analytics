import { Link } from "@tanstack/react-router";
import { Calendar, Ruler, Weight, Target, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatPosition,
  formatHeight,
  formatWeight,
  formatDate,
  formatPercent,
} from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { PlayerDetail, Team } from "@/types";

interface LuckStats {
  goals: number;
  expectedGoals: number;
  shots: number;
}

interface PlayerHeaderProps {
  player: PlayerDetail;
  teams?: Team[];
  isGoalie: boolean;
  luckStats?: LuckStats;
}

export function PlayerHeader({ player, teams, isGoalie, luckStats }: PlayerHeaderProps) {
  const initials = player.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2);

  const getTeamName = (abbrev: string): string => {
    const team = teams?.find((t: Team) => t.abbreviation === abbrev);
    return team?.name ?? abbrev;
  };

  // Calculate luck metrics
  const luckDiff = luckStats ? luckStats.goals - luckStats.expectedGoals : null;
  const isLucky = luckDiff !== null && luckDiff > 1;
  const isUnlucky = luckDiff !== null && luckDiff < -1;
  const shootingPct = luckStats && luckStats.shots > 0
    ? (luckStats.goals / luckStats.shots) * 100
    : null;
  const expectedShootingPct = luckStats && luckStats.shots > 0
    ? (luckStats.expectedGoals / luckStats.shots) * 100
    : null;

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
          {luckStats && luckStats.expectedGoals > 0 && luckDiff !== null && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "flex items-center gap-1.5 cursor-help",
                  isLucky && "text-green-600 dark:text-green-400",
                  isUnlucky && "text-red-600 dark:text-red-400",
                  !isLucky && !isUnlucky && "text-yellow-600 dark:text-yellow-400"
                )}>
                  {isLucky && <TrendingUp className="h-3.5 w-3.5" />}
                  {isUnlucky && <TrendingDown className="h-3.5 w-3.5" />}
                  {!isLucky && !isUnlucky && <Minus className="h-3.5 w-3.5" />}
                  <span className="font-medium tabular-nums">
                    {luckDiff > 0 ? "+" : ""}{luckDiff.toFixed(1)} G
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="space-y-2">
                  <p className="font-semibold">
                    {isLucky && "Running hot!"}
                    {isUnlucky && "Due for regression"}
                    {!isLucky && !isUnlucky && "Shooting as expected"}
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-muted-foreground">Goals:</span>
                    <span className="font-medium">{luckStats.goals}</span>
                    <span className="text-muted-foreground">Expected:</span>
                    <span className="font-medium">{luckStats.expectedGoals.toFixed(1)}</span>
                    {shootingPct !== null && (
                      <>
                        <span className="text-muted-foreground">Sh%:</span>
                        <span className="font-medium">{formatPercent(shootingPct, false)}</span>
                      </>
                    )}
                    {expectedShootingPct !== null && (
                      <>
                        <span className="text-muted-foreground">xSh%:</span>
                        <span className="font-medium">{formatPercent(expectedShootingPct, false)}</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground pt-1 border-t">
                    {isLucky && "Scored more than shot quality suggests. May regress."}
                    {isUnlucky && "Scored fewer than expected. Due for positive regression."}
                    {!isLucky && !isUnlucky && "Scoring in line with expected goal models."}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}
