import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LiveIndicator, GoalsList } from "@/components/shared";
import { useTodaysGames, useGamesByDate } from "@/hooks";
import {
  formatGameDateLong,
  formatGameTimeShort,
  formatPeriod,
} from "@/lib/game-formatters";
import type { GameSummary } from "@/types";

const searchSchema = z.object({
  date: z.string().optional(),
});

export const Route = createFileRoute("/games/")({
  component: GamesPage,
  validateSearch: searchSchema,
});

// Format date as YYYY-MM-DD in local timezone
function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getYesterdayDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatLocalDate(d);
}

function getTodayDate(): string {
  return formatLocalDate(new Date());
}

function getTomorrowDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return formatLocalDate(d);
}

function GameCard({ game }: { game: GameSummary }) {
  const isCompleted = game.gameState === "OFF";
  const isLive = game.gameState === "LIVE" || game.gameState === "CRIT";
  const homeWins = isCompleted && (game.home.goals ?? 0) > (game.away.goals ?? 0);
  const awayWins = isCompleted && (game.away.goals ?? 0) > (game.home.goals ?? 0);

  // Get the appropriate record based on home/away context
  const awayDisplayRecord = game.away.roadRecord || game.away.record;
  const homeDisplayRecord = game.home.homeRecord || game.home.record;

  return (
    <Link to="/games/$gameId" params={{ gameId: game.gameId }}>
      <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              {isLive ? (
                <>
                  <LiveIndicator />
                  <span className="font-medium">
                    {formatPeriod(game.currentPeriod, game.inIntermission)}
                    {!game.inIntermission && game.timeRemaining && ` ${game.timeRemaining}`}
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
                <span>{formatGameTimeShort(game.startTimeUtc)}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {(isLive || isCompleted) && game.away.shotsOnGoal !== null && game.home.shotsOnGoal !== null && (
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
          <div className="space-y-2">
            <div className={`flex items-center justify-between ${awayWins ? "" : isCompleted ? "opacity-70" : ""}`}>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {game.away.teamCode}
                </Badge>
                <span className="text-sm truncate">{game.away.teamName}</span>
                {awayDisplayRecord && (
                  <span className="text-[10px] text-muted-foreground">
                    ({awayDisplayRecord}{game.away.roadRecord ? " away" : ""})
                  </span>
                )}
              </div>
              <span className={`font-mono text-lg font-bold ${awayWins ? "" : isCompleted ? "text-muted-foreground" : ""}`}>
                {game.away.goals ?? "-"}
              </span>
            </div>
            <div className={`flex items-center justify-between ${homeWins ? "" : isCompleted ? "opacity-70" : ""}`}>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {game.home.teamCode}
                </Badge>
                <span className="text-sm truncate">{game.home.teamName}</span>
                {homeDisplayRecord && (
                  <span className="text-[10px] text-muted-foreground">
                    ({homeDisplayRecord}{game.home.homeRecord ? " home" : ""})
                  </span>
                )}
              </div>
              <span className={`font-mono text-lg font-bold ${homeWins ? "" : isCompleted ? "text-muted-foreground" : ""}`}>
                {game.home.goals ?? "-"}
              </span>
            </div>
          </div>
          {/* Season Series & Streaks */}
          {(game.seasonSeries || game.away.streak || game.home.streak) && (
            <div className="text-[10px] text-muted-foreground text-center space-y-0.5">
              {game.seasonSeries && (
                <div>{game.seasonSeries}</div>
              )}
              {(game.away.streak || game.home.streak) && (
                <div>
                  {game.away.teamCode}: {game.away.streak || "-"}
                  {game.away.last10 && <span className="opacity-70 ml-1">L10: {game.away.last10}</span>}
                  <span className="mx-2 opacity-30">|</span>
                  {game.home.teamCode}: {game.home.streak || "-"}
                  {game.home.last10 && <span className="opacity-70 ml-1">L10: {game.home.last10}</span>}
                </div>
              )}
            </div>
          )}
          {game.hasShotData && isCompleted && game.away.expectedGoals !== null && game.home.expectedGoals !== null && (
            <div className="pt-2 border-t text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>xG: {game.away.expectedGoals.toFixed(1)}</span>
                <span>xG: {game.home.expectedGoals.toFixed(1)}</span>
              </div>
            </div>
          )}
          {isLive && game.goals && game.goals.length > 0 && (
            <GoalsList goals={game.goals} awayCode={game.away.teamCode} />
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function GameCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-10" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-6 w-6" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-10" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function GamesGrid({ games, isLoading, emptyMessage }: { games: GameSummary[]; isLoading: boolean; emptyMessage: string }) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <GameCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {games.map((game) => (
        <GameCard key={game.gameId} game={game} />
      ))}
    </div>
  );
}

function GamesPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const yesterdayDate = getYesterdayDate();
  const todayDate = getTodayDate();
  const tomorrowDate = getTomorrowDate();

  // Determine which tab/date is active
  // If user has explicitly set a date via URL, use custom mode for navigation
  const hasExplicitDate = search.date !== undefined;
  const activeDate = search.date || todayDate;
  const isYesterday = activeDate === yesterdayDate;
  const isToday = activeDate === todayDate;
  const isTomorrow = activeDate === tomorrowDate;
  const activeTab = isYesterday ? "yesterday" : isToday ? "today" : isTomorrow ? "tomorrow" : "custom";

  // Use the appropriate hook based on the date
  // Only use optimized today hook for default view, otherwise use date-based hook
  const { data: todayData, isLoading: todayLoading } = useTodaysGames();
  const { data: customData, isLoading: customLoading } = useGamesByDate(
    hasExplicitDate ? activeDate : undefined
  );

  // Determine which data to show
  let games: GameSummary[] = [];
  let isLoading = false;
  let displayDate = activeDate;

  if (!hasExplicitDate) {
    // Default view - use today's optimized hook
    games = todayData?.games ?? [];
    isLoading = todayLoading;
    displayDate = todayData?.date ?? todayDate;
  } else {
    // Any explicit date navigation uses the date-based hook
    games = customData?.games ?? [];
    isLoading = customLoading;
    displayDate = customData?.date ?? activeDate;
  }

  const handleTabChange = (tab: string) => {
    if (tab === "yesterday") {
      navigate({ search: { date: yesterdayDate } });
    } else if (tab === "today") {
      navigate({ search: { date: undefined } });
    } else if (tab === "tomorrow") {
      navigate({ search: { date: tomorrowDate } });
    }
  };

  const handleDateChange = (delta: number) => {
    const current = new Date(displayDate + "T12:00:00");
    current.setDate(current.getDate() + delta);
    const newDate = current.toISOString().split("T")[0];
    navigate({ search: { date: newDate } });
  };

  return (
    <div className="container py-6 space-y-6">
      <div>
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2">
          <ChevronLeft className="h-4 w-4" />
          Back to Home
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Games</h1>
        <p className="text-muted-foreground">
          Browse NHL games and view detailed analytics
        </p>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="yesterday">Yesterday</TabsTrigger>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="tomorrow">Tomorrow</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => handleDateChange(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-50 text-center">
            {formatGameDateLong(displayDate)}
          </span>
          <Button variant="outline" size="icon" onClick={() => handleDateChange(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <GamesGrid
        games={games}
        isLoading={isLoading}
        emptyMessage={`No games ${isYesterday ? "yesterday" : isToday ? "today" : isTomorrow ? "tomorrow" : "on this date"}`}
      />
    </div>
  );
}
