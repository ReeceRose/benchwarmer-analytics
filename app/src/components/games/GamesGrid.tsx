import { EmptyState } from "@/components/layout";
import { GameCard } from "@/components/games/GameCard";
import { GameCardSkeleton } from "@/components/games/GameCardSkeleton";
import type { GameSummary } from "@/types";

interface GamesGridProps {
  games: GameSummary[];
  isLoading: boolean;
  emptyMessage: string;
  /** Pregame home win chance by game ID, for upcoming games. */
  pregame?: Map<string, number>;
}

export function GamesGrid({ games, isLoading, emptyMessage, pregame }: GamesGridProps) {
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
      <EmptyState title={emptyMessage} hint="Use the arrows to check another day." />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {games.map((game) => (
        <GameCard key={game.gameId} game={game} homeWinProbability={pregame?.get(game.gameId)} />
      ))}
    </div>
  );
}
