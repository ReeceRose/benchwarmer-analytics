import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GamesGrid } from "@/components/games";
import { useTodaysGames, useGamesByDate } from "@/hooks";
import { formatGameDateLong } from "@/lib/game-formatters";
import {
  getYesterdayDate,
  getTodayDate,
  getTomorrowDate,
} from "@/lib/date-utils";
import type { GameSummary } from "@/types";

const searchSchema = z.object({
  date: z.string().optional(),
});

export const Route = createFileRoute("/games/")({
  component: GamesPage,
  validateSearch: searchSchema,
});

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
