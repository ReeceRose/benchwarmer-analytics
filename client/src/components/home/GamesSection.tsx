import { Link } from "@tanstack/react-router";
import { Calendar, TrendingUp, TrendingDown, ChevronRight } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LiveIndicator, GoalsList } from "@/components/shared";
import { useTodaysGames } from "@/hooks";
import { formatGameTime, formatGameDate, formatPeriod } from "@/lib/game-formatters";
import type { GameSummary, GameTeam } from "@/types";

function LuckIndicator({ diff }: { diff: number | null }) {
  if (diff === null) return null;

  if (diff >= 0.5) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <TrendingUp className="h-3 w-3 text-green-500" />
        </TooltipTrigger>
        <TooltipContent>
          <p>Outscored xG by {diff.toFixed(1)}</p>
        </TooltipContent>
      </Tooltip>
    );
  } else if (diff <= -0.5) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <TrendingDown className="h-3 w-3 text-red-500" />
        </TooltipTrigger>
        <TooltipContent>
          <p>Underperformed xG by {Math.abs(diff).toFixed(1)}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return null;
}

function TeamScore({
  team,
  isWinner,
  showStats,
  showRecord,
}: {
  team: GameTeam;
  isWinner: boolean;
  showStats: boolean;
  showRecord?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            {team.teamCode}
          </Badge>
          <span className="text-sm text-muted-foreground truncate hidden sm:inline">
            {team.teamName}
          </span>
          {showRecord && team.record && (
            <span className="text-[10px] text-muted-foreground hidden md:inline">
              ({team.record})
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {showStats && team.expectedGoals !== null && (
          <span className="text-xs text-muted-foreground font-mono hidden md:inline">
            xG: {team.expectedGoals.toFixed(1)}
          </span>
        )}
        <LuckIndicator diff={team.goalsVsXgDiff} />
        <span
          className={`font-mono text-lg font-bold tabular-nums ${isWinner ? "" : "text-muted-foreground"}`}
        >
          {team.goals ?? "-"}
        </span>
      </div>
    </div>
  );
}

function GameCard({ game }: { game: GameSummary }) {
  const isCompleted = game.gameState === "OFF";
  const isLive = game.gameState === "LIVE" || game.gameState === "CRIT";
  const isFuture = game.gameState === "FUT" || game.gameState === "PRE";
  const homeWins =
    isCompleted && (game.home.goals ?? 0) > (game.away.goals ?? 0);
  const awayWins =
    isCompleted && (game.away.goals ?? 0) > (game.home.goals ?? 0);

  return (
    <Link
      to="/games/$gameId"
      params={{ gameId: game.gameId }}
      className="block p-3 border rounded-lg space-y-2 hover:bg-muted/30 hover:border-primary/50 transition-colors cursor-pointer"
    >
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {isLive ? (
            <>
              <LiveIndicator />
              <span className="font-medium">
                {formatPeriod(game.currentPeriod, game.inIntermission)}
                {!game.inIntermission &&
                  game.timeRemaining &&
                  ` ${game.timeRemaining}`}
              </span>
            </>
          ) : isCompleted ? (
            <span>
              Final
              {game.periodType && game.periodType !== "REG" && (
                <Badge variant="secondary" className="ml-2 text-[10px] px-1">
                  {game.periodType}
                </Badge>
              )}
            </span>
          ) : (
            <span>{formatGameTime(game.startTimeUtc)}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {(isLive || isCompleted) &&
            game.away.shotsOnGoal !== null &&
            game.home.shotsOnGoal !== null && (
              <span className="font-mono text-[10px]">
                SOG: {game.away.shotsOnGoal}-{game.home.shotsOnGoal}
              </span>
            )}
          {game.hasShotData && !isLive && (
            <Badge variant="outline" className="text-[10px]">
              Stats
            </Badge>
          )}
        </div>
      </div>

      <TeamScore
        team={game.away}
        isWinner={awayWins}
        showStats={game.hasShotData && isCompleted}
        showRecord={isFuture || isLive}
      />
      <TeamScore
        team={game.home}
        isWinner={homeWins}
        showStats={game.hasShotData && isCompleted}
        showRecord={isFuture || isLive}
      />

      {game.hasShotData && game.periods.length > 0 && isCompleted && (
        <div className="pt-2 border-t">
          <div className="flex gap-2 text-[10px] text-muted-foreground">
            {game.periods.map((p) => (
              <div key={p.period} className="flex flex-col items-center">
                <span className="font-medium">P{p.period}</span>
                <span className="font-mono">
                  {p.awayGoals}-{p.homeGoals}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLive && game.goals && game.goals.length > 0 && (
        <GoalsList goals={game.goals} awayCode={game.away.teamCode} />
      )}
    </Link>
  );
}

function GamesGrid({
  games,
  emptyMessage,
}: {
  games: GameSummary[];
  emptyMessage: string;
}) {
  if (games.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {games.map((game) => (
        <GameCard key={game.gameId} game={game} />
      ))}
    </div>
  );
}

function GameCardSkeleton() {
  return (
    <div className="p-3 border rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-10" />
          <Skeleton className="h-4 w-24 hidden sm:block" />
        </div>
        <Skeleton className="h-6 w-6" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-10" />
          <Skeleton className="h-4 w-24 hidden sm:block" />
        </div>
        <Skeleton className="h-6 w-6" />
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <>
      <Skeleton className="h-4 w-32 mb-3" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <GameCardSkeleton key={i} />
        ))}
      </div>
    </>
  );
}

export function GamesSection() {
  const { data: todayData, isLoading: todayLoading } = useTodaysGames();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              Today's Games
              {todayLoading ? (
                <Skeleton className="ml-1 h-5 w-6 rounded-full" />
              ) : todayData ? (
                <Badge variant="secondary" className="ml-1">
                  {todayData.games.length}
                </Badge>
              ) : null}
            </CardTitle>
            <CardDescription>NHL game scores and analytics</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/games" className="text-muted-foreground hover:text-foreground">
              See more
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {todayLoading ? (
          <LoadingSkeleton />
        ) : todayData ? (
          <>
            <p className="text-xs text-muted-foreground mb-3">
              {formatGameDate(todayData.date)}
            </p>
            <GamesGrid
              games={todayData.games}
              emptyMessage="No games scheduled for today"
            />
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
