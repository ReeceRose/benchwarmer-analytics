import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SegmentedControl } from "@/components/layout";
import * as z from "zod/mini";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GamesGrid } from "@/components/games";
import { useTodaysGames, useGamesByDate, usePageTitle } from "@/hooks";
import { formatGameDateLong } from "@/lib/game-formatters";
import {
  getYesterdayDate,
  getTodayDate,
  getTomorrowDate,
} from "@/lib/date-utils";
import type { GameSummary } from "@/types";

const searchSchema = z.object({
  date: z.optional(z.string()),
});

export const Route = createFileRoute("/games/")({
  component: GamesPage,
  validateSearch: searchSchema,
});

function GamesPage() {
  usePageTitle("Games");

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
    <div className="container space-y-6 py-8">
      <PageHeader
        title="Games"
        description="Scores, previews and game-by-game analytics."
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          aria-label="Day"
          value={activeTab}
          onValueChange={handleTabChange}
          options={[
            { value: "yesterday", label: "Yesterday" },
            { value: "today", label: "Today" },
            { value: "tomorrow", label: "Tomorrow" },
          ]}
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleDateChange(-1)}
            aria-label="Previous day"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-56 text-center font-display font-semibold">
            {formatGameDateLong(displayDate)}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleDateChange(1)}
            aria-label="Next day"
          >
            <ChevronRight className="size-4" />
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
