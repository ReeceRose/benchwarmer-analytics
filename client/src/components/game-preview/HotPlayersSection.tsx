import { Link } from "@tanstack/react-router";
import { Flame, Snowflake } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getPlayerHeadshotUrl, getPlayerInitials } from "@/lib/player-headshots";
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
      className="flex items-center justify-between py-1.5 px-2 -mx-2 hover:bg-muted/50 rounded transition-colors"
    >
      <div className="flex items-center gap-2">
        {isHot ? (
          <Flame className="h-3.5 w-3.5 text-hot" />
        ) : (
          <Snowflake className="h-3.5 w-3.5 text-cold" />
        )}
        <Avatar className="h-6 w-6">
          <AvatarImage
            src={getPlayerHeadshotUrl(player.playerId, team)}
            alt={player.name}
          />
          <AvatarFallback className="text-[10px]">
            {getPlayerInitials(player.name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <span className="font-medium text-sm">{player.name}</span>
          {player.position && (
            <span className="text-xs text-muted-foreground ml-1">
              {player.position}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 text-right">
        <div className="text-xs text-muted-foreground">
          {player.goals}G / {player.expectedGoals.toFixed(1)} xG
        </div>
        <span
          className={`font-mono text-sm ${
            isHot ? "text-success" : "text-error"
          }`}
        >
          {isHot ? "+" : ""}
          {player.differential.toFixed(1)}
        </span>
      </div>
    </Link>
  );
}

function TeamColumn({
  team,
  players,
}: {
  team: string;
  players: HotPlayer[];
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
        {team}
      </div>
      {players.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hot players</p>
      ) : (
        players.map((player) => (
          <PlayerRow key={player.playerId} player={player} team={team} />
        ))
      )}
    </div>
  );
}

export function HotPlayersSection({
  data,
  homeTeam,
  awayTeam,
}: HotPlayersSectionProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Hot Players</h3>
      <p className="text-xs text-muted-foreground">
        Players outperforming expected goals (5v5)
      </p>

      <div className="grid grid-cols-2 gap-4">
        <TeamColumn team={homeTeam} players={data.home} />
        <TeamColumn team={awayTeam} players={data.away} />
      </div>
    </div>
  );
}
