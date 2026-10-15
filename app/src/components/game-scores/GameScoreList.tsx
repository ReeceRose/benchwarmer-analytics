import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatToi } from "@/lib/formatters";
import { formatGameDate } from "@/lib/game-formatters";
import { getPlayerHeadshotUrl, getPlayerInitials } from "@/lib/player-headshots";
import type { GameScoreEntry } from "@/types";

function statLine(e: GameScoreEntry): string {
  const parts = [];
  if (e.goals) parts.push(`${e.goals} G`);
  if (e.assists) parts.push(`${e.assists} A`);
  if (parts.length === 0) parts.push(e.shotsOnGoal ? `${e.shotsOnGoal} SOG` : "0 P");
  return `${parts.join(", ")} · ${formatToi(e.toiSeconds)}`;
}

function result(e: GameScoreEntry): string {
  const where = `${e.isHome ? "vs" : "@"} ${e.opponent}`;
  if (e.teamScore == null || e.opponentScore == null) return where;
  const outcome = e.teamScore > e.opponentScore ? "W" : "L";
  const extra = e.periodType && e.periodType !== "REG" ? ` ${e.periodType}` : "";
  return `${where} · ${outcome} ${e.teamScore}–${e.opponentScore}${extra}`;
}

/**
 * Ranked single-game performances. Each row links to the game; the meta line
 * gives the team, stat line and ice time, and `showDate` adds the date (for
 * season records rather than one night).
 */
export function GameScoreList({ entries, showDate = false }: { entries: GameScoreEntry[]; showDate?: boolean }) {
  return (
    <ol className="space-y-1">
      {entries.map((e, i) => (
        <li key={`${e.gameId}-${e.playerId}`}>
          <Link
            to="/games/$gameId"
            params={{ gameId: e.gameId }}
            className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-muted/60"
          >
            <span className="w-4 shrink-0 text-xs text-muted-foreground tabular-nums">{i + 1}</span>
            <Avatar className="size-8 shrink-0">
              <AvatarImage src={getPlayerHeadshotUrl(e.playerId, e.team)} alt="" />
              <AvatarFallback className="text-[10px]">{getPlayerInitials(e.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium group-hover:text-link">{e.name}</div>
              <div className="truncate text-xs text-muted-foreground">
                {e.team} · {statLine(e)}
                {showDate && ` · ${formatGameDate(e.gameDate)}`}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="font-semibold tabular-nums">{e.gameScore.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground tabular-nums">{result(e)}</div>
            </div>
          </Link>
        </li>
      ))}
    </ol>
  );
}

/** Skeleton with the same row footprint as `GameScoreList`. */
export function GameScoreListSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 py-1.5">
          <Skeleton className="h-3 w-4" />
          <Skeleton className="size-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-44" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="ml-auto h-4 w-10" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}
