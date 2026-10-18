import { Link } from "@tanstack/react-router";
import { InjuryBadge } from "@/components/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPositionShort } from "@/lib/formatters";
import { earliestReturn, injuryReason, shortDate } from "@/lib/injuries";
import { getPlayerHeadshotUrl, getPlayerInitials } from "@/lib/player-headshots";
import type { InjuredPlayer, LeagueInjuredPlayer } from "@/types";

const rowClass = "-mx-2 flex items-center gap-3 rounded-xl px-2 py-1.5";

type ListedPlayer = InjuredPlayer | LeagueInjuredPlayer;

function InjuryRow({ player, team }: { player: ListedPlayer; team: string }) {
  const { injury } = player;
  const earliest = earliestReturn(injury);
  const content = (
    <>
      <Avatar className="size-8 shrink-0">
        <AvatarImage src={player.playerId ? getPlayerHeadshotUrl(player.playerId, team) : undefined} alt="" />
        <AvatarFallback className="text-[10px]">{getPlayerInitials(player.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium group-hover:text-link">{player.name}</div>
        <div className="truncate text-xs text-muted-foreground" title={injury.comment ?? undefined}>
          {"team" in player ? `${player.team} · ` : ""}
          {player.position ? `${formatPositionShort(player.position)} · ` : ""}
          {injuryReason(injury)}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <InjuryBadge injury={injury} />
        <div className="mt-1 text-xs text-muted-foreground tabular-nums">
          {earliest ? `Earliest ${earliest}` : `Since ${shortDate(injury.since)}`}
        </div>
      </div>
    </>
  );
  return (
    <li>
      {player.playerId ? (
        <Link to="/players/$id" params={{ id: String(player.playerId) }} className={`group ${rowClass} hover:bg-muted/60`}>
          {content}
        </Link>
      ) : (
        <div className={rowClass}>{content}</div>
      )}
    </li>
  );
}

/**
 * Injured players as list rows: headshot, name, position and reason, the
 * status chip, and the earliest they can return (or when they went on the list).
 * Players with no NHL games yet have no page, so their rows don't link.
 * League-wide lists pass players with their own `team`, which the meta line
 * then leads with.
 */
export function InjuryList({
  players,
  team,
  empty = "No injuries reported.",
}: {
  players: InjuredPlayer[] | LeagueInjuredPlayer[];
  team?: string;
  empty?: string;
}) {
  if (players.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ol className="space-y-1">
      {players.map((p) => (
        <InjuryRow key={`${p.playerId ?? p.name}`} player={p} team={"team" in p ? p.team : (team ?? "")} />
      ))}
    </ol>
  );
}

export function InjuryListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 py-1.5">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="ml-auto h-4 w-9 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
