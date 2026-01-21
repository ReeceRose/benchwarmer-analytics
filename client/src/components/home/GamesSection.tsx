import { Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useYesterdaysGames, useTodaysGames } from "@/hooks";
import type { GameSummary, GameTeam } from "@/types";

function formatTime(utcTime: string | null): string {
  if (!utcTime) return "TBD";
  const date = new Date(utcTime);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function LuckIndicator({ diff }: { diff: number | null }) {
  if (diff === null) return null;

  if (diff >= 0.5) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <TrendingUp className="h-3 w-3 text-green-500" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Outscored xG by {diff.toFixed(1)}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  } else if (diff <= -0.5) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <TrendingDown className="h-3 w-3 text-red-500" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Underperformed xG by {Math.abs(diff).toFixed(1)}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return null;
}

function TeamScore({ team, isWinner, showStats }: { team: GameTeam; isWinner: boolean; showStats: boolean }) {
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
        </div>
      </div>
      <div className="flex items-center gap-2">
        {showStats && team.expectedGoals !== null && (
          <span className="text-xs text-muted-foreground font-mono hidden md:inline">
            xG: {team.expectedGoals.toFixed(1)}
          </span>
        )}
        <LuckIndicator diff={team.goalsVsXgDiff} />
        <span className={`font-mono text-lg font-bold tabular-nums ${isWinner ? "" : "text-muted-foreground"}`}>
          {team.goals ?? "-"}
        </span>
      </div>
    </div>
  );
}

function GameCard({ game }: { game: GameSummary }) {
  const isCompleted = game.gameState === "OFF";
  const homeWins = isCompleted && (game.home.goals ?? 0) > (game.away.goals ?? 0);
  const awayWins = isCompleted && (game.away.goals ?? 0) > (game.home.goals ?? 0);

  return (
    <div className="p-3 border rounded-lg space-y-2 hover:bg-muted/30 transition-colors">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {isCompleted ? "Final" : formatTime(game.startTimeUtc)}
          {game.periodType && game.periodType !== "REG" && (
            <Badge variant="secondary" className="ml-2 text-[10px] px-1">
              {game.periodType}
            </Badge>
          )}
        </span>
        {game.hasShotData && (
          <Badge variant="outline" className="text-[10px]">
            Stats available
          </Badge>
        )}
      </div>

      <TeamScore team={game.away} isWinner={awayWins} showStats={game.hasShotData} />
      <TeamScore team={game.home} isWinner={homeWins} showStats={game.hasShotData} />

      {game.hasShotData && game.periods.length > 0 && (
        <div className="pt-2 border-t">
          <div className="flex gap-2 text-[10px] text-muted-foreground">
            {game.periods.map((p) => (
              <div key={p.period} className="flex flex-col items-center">
                <span className="font-medium">P{p.period}</span>
                <span className="font-mono">{p.awayGoals}-{p.homeGoals}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GamesGrid({ games, emptyMessage }: { games: GameSummary[]; emptyMessage: string }) {
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
  const { data: yesterdayData, isLoading: yesterdayLoading } = useYesterdaysGames();
  const { data: todayData, isLoading: todayLoading } = useTodaysGames();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-orange-500" />
          Games
        </CardTitle>
        <CardDescription>NHL game scores and analytics</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="yesterday">
          <TabsList className="mb-4">
            <TabsTrigger value="yesterday" className="gap-1">
              Yesterday
              {yesterdayLoading ? (
                <Skeleton className="ml-1 h-4 w-5 rounded-full" />
              ) : yesterdayData ? (
                <Badge variant="secondary" className="ml-1 text-[10px]">
                  {yesterdayData.games.length}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="today" className="gap-1">
              Today
              {todayLoading ? (
                <Skeleton className="ml-1 h-4 w-5 rounded-full" />
              ) : todayData ? (
                <Badge variant="secondary" className="ml-1 text-[10px]">
                  {todayData.games.length}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="yesterday">
            {yesterdayLoading ? (
              <LoadingSkeleton />
            ) : yesterdayData ? (
              <>
                <p className="text-xs text-muted-foreground mb-3">
                  {formatDate(yesterdayData.date)}
                </p>
                <GamesGrid games={yesterdayData.games} emptyMessage="No games yesterday" />
              </>
            ) : null}
          </TabsContent>

          <TabsContent value="today">
            {todayLoading ? (
              <LoadingSkeleton />
            ) : todayData ? (
              <>
                <p className="text-xs text-muted-foreground mb-3">
                  {formatDate(todayData.date)}
                </p>
                <GamesGrid games={todayData.games} emptyMessage="No games scheduled for today" />
              </>
            ) : null}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
