import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LiveIndicator } from "@/components/shared";
import {
  formatGameDateLong,
  formatGameTime,
  formatPeriod,
  getSeasonFromDate,
} from "@/lib/game-formatters";
import type { GameSummary, GameGoal } from "@/types";

interface GameHeaderProps {
  game: GameSummary;
}

function DetailedGoalsList({
  goals,
  awayCode,
}: {
  goals: GameGoal[];
  awayCode: string;
}) {
  if (!goals || goals.length === 0) return null;

  return (
    <div className="pt-4 border-t text-sm">
      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
        Goals
      </div>
      <div className="space-y-1">
        {goals.map((goal, idx) => (
          <div key={idx} className="flex items-center justify-center gap-2">
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              {goal.teamCode === awayCode ? "A" : "H"}
            </Badge>
            <span className="font-medium">{goal.scorerName}</span>
            <span className="text-muted-foreground">
              {formatPeriod(goal.period)} {goal.timeInPeriod}
            </span>
            {goal.strength && goal.strength !== "ev" && (
              <Badge
                variant="secondary"
                className="text-xs px-1.5 py-0 uppercase"
              >
                {goal.strength}
              </Badge>
            )}
            {goal.assists.length > 0 && (
              <span className="text-muted-foreground text-xs">
                ({goal.assists.join(", ")})
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function GameHeader({ game }: GameHeaderProps) {
  const isCompleted = game.gameState === "OFF";
  const isLive = game.gameState === "LIVE" || game.gameState === "CRIT";
  const homeWins =
    isCompleted && (game.home.goals ?? 0) > (game.away.goals ?? 0);
  const awayWins =
    isCompleted && (game.away.goals ?? 0) > (game.home.goals ?? 0);
  const season = getSeasonFromDate(game.gameDate);

  return (
    <Card className="p-6">
      <div className="text-center space-y-4">
        <div className="text-sm text-muted-foreground uppercase tracking-wide">
          {isLive ? (
            <div className="flex items-center justify-center gap-2">
              <LiveIndicator />
              <span className="font-medium text-foreground">
                {formatPeriod(game.currentPeriod, game.inIntermission)}
                {!game.inIntermission &&
                  game.timeRemaining &&
                  ` ${game.timeRemaining}`}
              </span>
              {game.away.shotsOnGoal !== null &&
                game.home.shotsOnGoal !== null && (
                  <span className="font-mono text-xs">
                    SOG: {game.away.shotsOnGoal}-{game.home.shotsOnGoal}
                  </span>
                )}
            </div>
          ) : isCompleted ? (
            <>
              Final
              {game.periodType && game.periodType !== "REG" && (
                <Badge variant="secondary" className="ml-2">
                  {game.periodType}
                </Badge>
              )}
            </>
          ) : (
            "Scheduled"
          )}
        </div>

        <div className="flex items-center justify-center gap-8">
          <Link
            to="/teams/$abbrev"
            params={{ abbrev: game.away.teamCode }}
            search={{ season }}
            className={`text-center hover:opacity-100 transition-opacity ${awayWins ? "" : "opacity-70"}`}
          >
            <div className="text-2xl font-bold hover:text-primary transition-colors">
              {game.away.teamCode}
            </div>
            <div className="text-sm text-muted-foreground">
              {game.away.teamName}
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <span
              className={`text-5xl font-bold tabular-nums ${awayWins ? "" : "text-muted-foreground"}`}
            >
              {game.away.goals ?? "-"}
            </span>
            <span className="text-2xl text-muted-foreground">-</span>
            <span
              className={`text-5xl font-bold tabular-nums ${homeWins ? "" : "text-muted-foreground"}`}
            >
              {game.home.goals ?? "-"}
            </span>
          </div>

          <Link
            to="/teams/$abbrev"
            params={{ abbrev: game.home.teamCode }}
            search={{ season }}
            className={`text-center hover:opacity-100 transition-opacity ${homeWins ? "" : "opacity-70"}`}
          >
            <div className="text-2xl font-bold hover:text-primary transition-colors">
              {game.home.teamCode}
            </div>
            <div className="text-sm text-muted-foreground">
              {game.home.teamName}
            </div>
          </Link>
        </div>

        <div className="text-sm text-muted-foreground">
          {formatGameDateLong(game.gameDate)}
          {game.startTimeUtc && ` • ${formatGameTime(game.startTimeUtc)}`}
        </div>

        {game.periods.length > 0 && (
          <div className="flex items-center justify-center gap-4 pt-2 border-t">
            {game.periods.map((p) => (
              <div key={p.period} className="text-center">
                <div className="text-xs text-muted-foreground font-medium">
                  {p.period <= 3
                    ? `P${p.period}`
                    : p.period === 4
                      ? "OT"
                      : `OT${p.period - 3}`}
                </div>
                <div className="font-mono text-sm">
                  {p.awayGoals}-{p.homeGoals}
                </div>
              </div>
            ))}
          </div>
        )}

        {isLive && game.goals && game.goals.length > 0 && (
          <DetailedGoalsList goals={game.goals} awayCode={game.away.teamCode} />
        )}
      </div>
    </Card>
  );
}

export function GameHeaderSkeleton() {
  return (
    <Card className="p-6">
      <div className="text-center space-y-4">
        <Skeleton className="h-4 w-20 mx-auto" />
        <div className="flex items-center justify-center gap-8">
          <div className="text-center space-y-2">
            <Skeleton className="h-8 w-16 mx-auto" />
            <Skeleton className="h-4 w-24 mx-auto" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12" />
            <Skeleton className="h-6 w-4" />
            <Skeleton className="h-12 w-12" />
          </div>
          <div className="text-center space-y-2">
            <Skeleton className="h-8 w-16 mx-auto" />
            <Skeleton className="h-4 w-24 mx-auto" />
          </div>
        </div>
        <Skeleton className="h-4 w-48 mx-auto" />
      </div>
    </Card>
  );
}
