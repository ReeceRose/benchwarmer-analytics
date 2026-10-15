import { Link } from "@tanstack/react-router";
import { Flame, Snowflake } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TeamHeading } from "@/components/game-preview/TeamHeading";
import { InjuryBadge } from "@/components/shared";
import { getPlayerHeadshotUrl, getPlayerInitials } from "@/lib/player-headshots";
import { cn } from "@/lib/utils";
import type { HotPlayers, HotPlayer } from "@/types";

interface HotPlayersSectionProps {
  data: HotPlayers;
  homeTeam: string;
  awayTeam: string;
}

function PlayerRow({ player, team }: { player: HotPlayer; team: string }) {
  const isHot = player.trend === "hot";

  return (
    <Link
      to="/players/$id"
      params={{ id: player.playerId.toString() }}
      className="group -mx-2 flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-muted/60"
    >
      <Avatar className="size-7">
        <AvatarImage src={getPlayerHeadshotUrl(player.playerId, team)} alt={player.name} />
        <AvatarFallback className="text-[10px]">{getPlayerInitials(player.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium group-hover:text-link">
          {player.name}
          {player.position && (
            <span className="ml-1 text-xs font-normal text-muted-foreground">{player.position}</span>
          )}
          <InjuryBadge injury={player.injury} className="ml-1.5 align-[1px]" />
        </div>
        <div className="text-xs text-muted-foreground tabular-nums">
          {player.goals} G · {player.expectedGoals.toFixed(1)} xG
        </div>
      </div>
      <span
        className={cn(
          "flex shrink-0 items-center gap-1 text-sm font-semibold tabular-nums",
          isHot ? "text-hot" : "text-cold",
        )}
      >
        {isHot ? <Flame className="size-3.5" /> : <Snowflake className="size-3.5" />}
        {isHot ? "+" : ""}
        {player.differential.toFixed(1)}
      </span>
    </Link>
  );
}

function TeamColumn({ team, players }: { team: string; players: HotPlayer[] }) {
  return (
    <div className="min-w-0">
      <TeamHeading team={team} />
      {players.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nobody running hot or cold</p>
      ) : (
        players.map((player) => <PlayerRow key={player.playerId} player={player} team={team} />)
      )}
    </div>
  );
}

export function HotPlayersSection({ data, homeTeam, awayTeam }: HotPlayersSectionProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
      <TeamColumn team={awayTeam} players={data.away} />
      <TeamColumn team={homeTeam} players={data.home} />
    </div>
  );
}
