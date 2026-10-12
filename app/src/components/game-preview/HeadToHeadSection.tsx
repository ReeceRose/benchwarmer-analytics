import { TeamLogo } from "@/components/team-detail/TeamLogo";
import { formatGameDate } from "@/lib/game-formatters";
import type { HeadToHead } from "@/types";

/** Earlier meetings this season, most recent first. */
export function HeadToHeadSection({ data }: { data: HeadToHead }) {
  const { lastFive } = data;

  if (lastFive.length === 0) {
    return <p className="text-sm text-muted-foreground">First meeting of the season</p>;
  }

  return (
    <ol className="divide-y">
      {lastFive.map((game, idx) => (
        <li key={idx} className="flex items-center gap-4 py-2.5 text-sm first:pt-0 last:pb-0">
          <span className="w-24 shrink-0 text-muted-foreground">{formatGameDate(game.date)}</span>
          <span className="flex-1 tabular-nums">{game.score}</span>
          {game.overtimeType && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold uppercase">
              {game.overtimeType}
            </span>
          )}
          <span className="flex w-16 shrink-0 items-center justify-end gap-1.5 font-semibold">
            <TeamLogo abbrev={game.winner} size="sm" />
            {game.winner}
          </span>
        </li>
      ))}
    </ol>
  );
}
