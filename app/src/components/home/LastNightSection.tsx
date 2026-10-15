import { Link } from "@tanstack/react-router";
import { ErrorState } from "@/components/shared";
import { Panel, Section } from "@/components/layout";
import { GameScoreList, GameScoreListSkeleton } from "@/components/game-scores/GameScoreList";
import { useNightlyGameScores } from "@/hooks";
import { daysSinceGameDate, formatGameDateLong } from "@/lib/game-formatters";

// Past this, the latest night is old news (offseason, All-Star or Olympic break).
const MAX_DAYS_OLD = 6;

function title(date: string): string {
  const days = daysSinceGameDate(date);
  if (days <= 0) return "Today's best and worst games";
  if (days === 1) return "Last night's best and worst games";
  const weekday = new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" });
  return `${weekday}'s best and worst games`;
}

function description(date: string, covered: number, final: number): string {
  const games = `${covered} ${covered === 1 ? "game" : "games"}`;
  const missing = final - covered;
  const note = missing > 0 ? ` ${missing} more had no NHL shift data, so they aren't included.` : "";
  return `Game Score from ${formatGameDateLong(date)}, across ${games}.${note}`;
}

/** The best five and worst three single-game Game Scores from the latest night of games, if it was recent. */
export function LastNightSection() {
  const { data, isLoading, error, refetch } = useNightlyGameScores();

  if (data && (!data.date || daysSinceGameDate(data.date) > MAX_DAYS_OLD)) return null;

  return (
    <Section
      title={data?.date ? title(data.date) : "Last night's best and worst games"}
      description={data?.date ? description(data.date, data.gamesWithScores, data.gamesFinal) : "Game Score from the latest night of games."}
      action={
        <Link to="/glossary" hash="GS/GP" className="text-link">
          What's Game Score?
        </Link>
      }
    >
      {error ? (
        <ErrorState title="Couldn't load Game Scores" message="The Game Score request failed." onRetry={refetch} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel>
            <h3 className="mb-2 text-sm font-semibold">Best</h3>
            {isLoading || !data ? <GameScoreListSkeleton rows={5} /> : <GameScoreList entries={data.best} />}
          </Panel>
          <Panel>
            <h3 className="mb-2 text-sm font-semibold">Worst</h3>
            {isLoading || !data ? <GameScoreListSkeleton rows={3} /> : <GameScoreList entries={data.worst} />}
          </Panel>
        </div>
      )}
    </Section>
  );
}
