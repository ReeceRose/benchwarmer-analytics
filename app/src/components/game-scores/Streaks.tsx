import { Link } from "@tanstack/react-router";
import { Panel, Section } from "@/components/layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useStreaks } from "@/hooks";
import { formatGameDate } from "@/lib/game-formatters";
import { getPlayerHeadshotUrl, getPlayerInitials } from "@/lib/player-headshots";
import type { StreakEntry } from "@/types";

function StreakList({ entries, value }: { entries: StreakEntry[]; value: (e: StreakEntry) => string }) {
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">Nobody's on a run of three or more games right now.</p>;
  return (
    <ol className="space-y-1">
      {entries.map((e) => (
        <li key={e.playerId}>
          <Link
            to="/players/$id"
            params={{ id: String(e.playerId) }}
            search={{ tab: "log" }}
            className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-muted/60"
          >
            <Avatar className="size-8 shrink-0">
              <AvatarImage src={getPlayerHeadshotUrl(e.playerId, e.team)} alt="" />
              <AvatarFallback className="text-[10px]">{getPlayerInitials(e.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium group-hover:text-link">{e.name}</div>
              <div className="truncate text-xs text-muted-foreground">
                {e.team} · {value(e)}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="font-semibold tabular-nums" title={e.atLeast ? "Runs back to a game we don't have shift data for" : undefined}>
                {e.games}
                {e.atLeast ? "+" : ""} games
              </div>
              <div className="text-xs text-muted-foreground">last {formatGameDate(e.lastGameDate)}</div>
            </div>
          </Link>
        </li>
      ))}
    </ol>
  );
}

/** The league's longest current point streaks and Game Score 1.0+ streaks. */
export function StreaksSection() {
  const { data, isLoading, error } = useStreaks();
  if (error || (data && data.season === null)) return null;
  return (
    <Section
      title="Current streaks"
      description="Skaters on the longest active runs: games in a row with a point, and with a Game Score of 1.0 or more (about a player's best quarter of games)."
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel>
          <h3 className="mb-2 text-sm font-semibold">Point streaks</h3>
          {isLoading || !data ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : (
            <StreakList entries={data.points} value={(e) => `${e.points} points`} />
          )}
        </Panel>
        <Panel>
          <h3 className="mb-2 text-sm font-semibold">Game Score 1.0+ streaks</h3>
          {isLoading || !data ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : (
            <StreakList entries={data.gameScore} value={(e) => `${e.gameScore.toFixed(1)} Game Score in all`} />
          )}
        </Panel>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Regular season, from games with NHL shift data. A streak can't be followed past a game we don't have yet, so "4+" means it
        may run longer. A streak ends when a player hasn't played for a week.
      </p>
    </Section>
  );
}

/** One line under a player's game log: their current streaks, if any. */
export function PlayerStreakLine({ playerId }: { playerId: number }) {
  const { data } = useStreaks(playerId);
  const point = data?.points[0];
  const score = data?.gameScore[0];
  const parts = [
    point && point.games >= 2 && `a point in ${point.games}${point.atLeast ? "+" : ""} straight games (${point.points} points)`,
    score && score.games >= 2 && `a Game Score of 1.0+ in ${score.games}${score.atLeast ? "+" : ""} straight`,
  ].filter(Boolean);
  if (parts.length === 0) return null;
  return <p className="text-sm">On a run: {parts.join(", and ")}.</p>;
}
