import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { ErrorState } from "@/components/shared";
import {
  GameDetailHeader,
  GameDetailHeaderSkeleton,
  GameBoxscoreTable,
  GameBoxscoreTableSkeleton,
  GameShotMap,
  GameShotMapSkeleton,
  XGProgressionChart,
  XGProgressionChartSkeleton,
  ShotGoalTimelineChart,
  ShotGoalTimelineChartSkeleton,
  DeserveToWinChart,
  DeserveToWinChartSkeleton,
} from "@/components/game-detail";
import {
  GamePreviewSections,
  GamePreviewSectionsSkeleton,
} from "@/components/game-preview";
import {
  useGame,
  useGameBoxscore,
  useGameShots,
  useGamePreview,
  useGoalieRecentForm,
  useDeserveToWin,
  usePageTitle,
} from "@/hooks";
import { getSeasonFromDate } from "@/lib/date-utils";

export const Route = createFileRoute("/games/$gameId")({
  component: GameDetailPage,
});

function GameDetailPage() {
  const router = useRouter();
  const { gameId } = Route.useParams();

  // Load ALL queries in parallel for faster page load
  // Each query starts immediately rather than waiting for game state
  const {
    data: game,
    isLoading: gameLoading,
    error: gameError,
    refetch,
  } = useGame(gameId);

  // Set page title with team matchup
  const gameTitle = game
    ? `${game.away.teamCode} @ ${game.home.teamCode}`
    : undefined;
  usePageTitle(gameTitle);

  const { data: boxscoreData, isLoading: boxscoreLoading } =
    useGameBoxscore(gameId);

  const {
    data: previewData,
    isLoading: previewLoading,
    error: previewError,
  } = useGamePreview(gameId);

  const { data: goalieFormData } = useGoalieRecentForm(gameId);

  // Only fetch shots for completed games that have shot data
  const shouldFetchShots = game?.hasShotData && game?.gameState === "OFF";
  const { data: shotsData, isLoading: shotsLoading } = useGameShots(
    gameId,
    shouldFetchShots
  );

  // Fetch deserve-to-win data for completed games with shot data
  const { data: deserveToWinData, isLoading: deserveToWinLoading } = useDeserveToWin(
    shouldFetchShots ? gameId : undefined
  );

  // Determine game state for conditional rendering (queries already running)
  const isFutureGame = game?.gameState === "FUT" || game?.gameState === "PRE";
  const isCompletedOrLive = game && !isFutureGame;

  const season = game
    ? getSeasonFromDate(new Date(game.gameDate + "T12:00:00"))
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

      {gameLoading && !game ? (
        <GameDetailHeaderSkeleton />
      ) : game || previewData ? (
        <GameDetailHeader game={game} preview={previewData} />
      ) : null}

      {isFutureGame &&
        (previewLoading ? (
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
        ) : null)}

      {isCompletedOrLive &&
        (boxscoreLoading ? (
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
        ))}

      {game?.gameState === "OFF" &&
        game?.hasShotData &&
        (shotsLoading ? (
          <>
            <GameShotMapSkeleton />
            <XGProgressionChartSkeleton />
            <DeserveToWinChartSkeleton />
            <ShotGoalTimelineChartSkeleton />
          </>
        ) : shotsData ? (
          <>
            <GameShotMap shotsData={shotsData} />
            <XGProgressionChart shotsData={shotsData} />
            {deserveToWinLoading ? (
              <DeserveToWinChartSkeleton />
            ) : deserveToWinData ? (
              <DeserveToWinChart data={deserveToWinData} />
            ) : null}
            <ShotGoalTimelineChart shotsData={shotsData} />
          </>
        ) : null)}
    </div>
  );
}
