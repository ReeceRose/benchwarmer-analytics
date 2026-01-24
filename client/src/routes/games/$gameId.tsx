import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { ErrorState } from "@/components/shared";
import {
  GameDetailHeader,
  GameDetailHeaderSkeleton,
  GameBoxscoreTable,
  GameBoxscoreTableSkeleton,
} from "@/components/game-detail";
import {
  GamePreviewSections,
  GamePreviewSectionsSkeleton,
} from "@/components/game-preview";
import {
  useGame,
  useGameBoxscore,
  useGamePreview,
  useGoalieRecentForm,
} from "@/hooks";

export const Route = createFileRoute("/games/$gameId")({
  component: GameDetailPage,
});

function getSeasonFromDate(dateStr: string): number {
  const date = new Date(dateStr + "T12:00:00");
  const year = date.getFullYear();
  const month = date.getMonth();
  return month < 9 ? year - 1 : year;
}

function GameDetailPage() {
  const router = useRouter();
  const { gameId } = Route.useParams();
  const {
    data: game,
    isLoading: gameLoading,
    error: gameError,
    refetch,
  } = useGame(gameId);

  // Determine if this is a future game (show preview) or completed/live (show boxscore)
  const isFutureGame = game?.gameState === "FUT" || game?.gameState === "PRE";
  const isLive = game?.gameState === "LIVE" || game?.gameState === "CRIT";
  const isCompletedOrLive = game && !isFutureGame;

  // Only fetch boxscore for completed/live games
  const { data: boxscoreData, isLoading: boxscoreLoading } = useGameBoxscore(
    isCompletedOrLive ? gameId : undefined
  );

  // Fetch preview for future games AND live games (for series/streak data)
  const {
    data: previewData,
    isLoading: previewLoading,
    error: previewError,
  } = useGamePreview(isFutureGame || isLive ? gameId : undefined);

  // Fetch goalie recent form separately (allows preview to load faster)
  const { data: goalieFormData } = useGoalieRecentForm(
    isFutureGame ? gameId : undefined
  );

  const season = game
    ? getSeasonFromDate(game.gameDate)
    : new Date().getFullYear();

  const handleBack = () => {
    router.history.back();
  };

  if (gameError) {
    return (
      <div className="container py-6">
        <button
          onClick={handleBack}
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Games
        </button>
        <ErrorState
          title="Failed to load game"
          message="Could not fetch game data. The game may not exist or the API may be unavailable."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <button
        onClick={handleBack}
        className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Games
      </button>

      {/* Unified header for all game states */}
      {gameLoading && !game ? (
        <GameDetailHeaderSkeleton />
      ) : (game || previewData) ? (
        <GameDetailHeader game={game} preview={previewData} />
      ) : null}

      {/* Preview sections for future games */}
      {isFutureGame && (
        previewLoading ? (
          <GamePreviewSectionsSkeleton />
        ) : previewData ? (
          <GamePreviewSections
            preview={previewData}
            goalieRecentForm={goalieFormData}
          />
        ) : previewError ? (
          <ErrorState
            title="Failed to load preview"
            message="Could not fetch game preview data."
            onRetry={() => refetch()}
          />
        ) : null
      )}

      {/* Boxscore for completed/live games */}
      {isCompletedOrLive && (
        boxscoreLoading ? (
          <GameBoxscoreTableSkeleton />
        ) : boxscoreData ? (
          <GameBoxscoreTable
            boxscoreData={boxscoreData}
            season={season}
            goals={game.goals}
          />
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Box score not available for this game.
          </div>
        )
      )}
    </div>
  );
}
