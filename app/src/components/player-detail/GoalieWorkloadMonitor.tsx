import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Panel, SegmentedControl } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";
import { useGoalieWorkload } from "@/hooks";
import {
  WorkloadWindowCard,
  BackToBackSplitsDisplay,
  ShotsAgainstChart,
  SavePercentageChart,
} from "@/components/goalie-workload";
import { getCurrentSeason } from "@/lib/date-utils";
import { formatSeason } from "@/lib/formatters";
import { formatGameDateLong } from "@/lib/game-formatters";
import { cn } from "@/lib/utils";
import type { GoalieGameStats } from "@/types";

interface GoalieWorkloadMonitorProps {
  playerId: number;
  season: number;
  className?: string;
}

const GAME_LIMITS = [
  { value: "10", label: "10 games" },
  { value: "20", label: "20 games" },
  { value: "30", label: "30 games" },
] as const;

type GameLimit = (typeof GAME_LIMITS)[number]["value"];

// Only a heavy workload is a warning; light and moderate are plain facts.
const TREND = {
  heavy: { label: "Heavy workload", className: "bg-warning/15 text-warning" },
  moderate: { label: "Moderate workload", className: "bg-muted text-muted-foreground" },
  light: { label: "Light workload", className: "bg-muted text-muted-foreground" },
};

export function GoalieWorkloadMonitor({
  playerId,
  season,
  className,
}: GoalieWorkloadMonitorProps) {
  const [gameLimit, setGameLimit] = useState<GameLimit>("10");

  const { data, isLoading, isFetching } = useGoalieWorkload(
    playerId,
    season,
    parseInt(gameLimit)
  );

  const chartData = useMemo(() => {
    if (!data?.games) return [];
    return data.games.map((game: GoalieGameStats, index: number) => ({
      game: index + 1,
      gameId: game.gameId,
      date: game.gameDate,
      opponent: game.opponent,
      shotsAgainst: game.shotsAgainst,
      savePercentage: game.savePercentage,
      gsax: game.goalsSavedAboveExpected,
      isB2B: game.isBackToBack,
    }));
  }, [data]);

  if (isLoading) {
    return (
      <Panel className={cn("space-y-5", className)}>
        <Skeleton className="h-5 w-40" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full" />
      </Panel>
    );
  }

  if (!data || data.gamesIncluded < 3) {
    return null;
  }

  const currentSeason = getCurrentSeason();
  const isPastSeason = data.season < currentSeason;
  const notPlaying = !isPastSeason && data.last30Days.gamesPlayed === 0;
  const trend = notPlaying
    ? { label: "Not playing", className: "bg-muted text-muted-foreground" }
    : TREND[data.workloadTrend];
  const prefix = isPastSeason ? "Final" : "Last";

  return (
    <Panel className={cn("space-y-6", className)}>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold">
            {isPastSeason ? `End of the ${formatSeason(data.season)} season` : "Recent workload"}
          </h3>
          {!isPastSeason && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                trend.className
              )}
            >
              {data.workloadTrend === "heavy" && !notPlaying && <AlertTriangle className="size-3" />}
              {trend.label}
            </span>
          )}
        </div>
        {isPastSeason && (
          <p className="text-xs text-muted-foreground">
            No games in {formatSeason(currentSeason)} yet. These windows end at the last game played,{" "}
            {data.lastGameDate && formatGameDateLong(data.lastGameDate)}.
          </p>
        )}
        {notPlaying && data.lastGameDate && (
          <p className="text-xs text-muted-foreground">
            No games in the last 30 days. Last game {formatGameDateLong(data.lastGameDate)}.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <WorkloadWindowCard window={data.last7Days} prefix={prefix} />
        <WorkloadWindowCard window={data.last14Days} prefix={prefix} />
        <WorkloadWindowCard window={data.last30Days} prefix={prefix} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold">Game by game</h4>
          <p className="text-xs text-muted-foreground">
            {isFetching
              ? "Loading…"
              : data.gamesIncluded < parseInt(gameLimit)
                ? `All ${data.gamesIncluded} games this season`
                : `Last ${gameLimit} games`}
          </p>
        </div>
        <SegmentedControl
          aria-label="Games shown"
          value={gameLimit}
          onValueChange={setGameLimit}
          options={GAME_LIMITS}
        />
      </div>

      <ShotsAgainstChart data={chartData} />
      <SavePercentageChart data={chartData} />

      {data.backToBackSplits.backToBackGames > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold">Back-to-backs</h4>
          <BackToBackSplitsDisplay splits={data.backToBackSplits} />
        </div>
      )}
    </Panel>
  );
}
