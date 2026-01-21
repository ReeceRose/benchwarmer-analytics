import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { ErrorState } from "@/components/shared";
import {
  GameHeader,
  GameHeaderSkeleton,
  GameBoxscoreTable,
  GameBoxscoreTableSkeleton,
} from "@/components/game-detail";
import { useGame, useGameBoxscore } from "@/hooks";

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
  const { data: game, isLoading: gameLoading, error: gameError, refetch } = useGame(gameId);
  const { data: boxscoreData, isLoading: boxscoreLoading } = useGameBoxscore(gameId);

  const season = game ? getSeasonFromDate(game.gameDate) : new Date().getFullYear();

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
      {gameLoading ? <GameHeaderSkeleton /> : game ? <GameHeader game={game} /> : null}
      {game && (
        boxscoreLoading ? (
          <GameBoxscoreTableSkeleton />
        ) : boxscoreData ? (
          <GameBoxscoreTable boxscoreData={boxscoreData} season={season} />
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Box score not available for this game.
          </div>
        )
      )}
    </div>
  );
}
