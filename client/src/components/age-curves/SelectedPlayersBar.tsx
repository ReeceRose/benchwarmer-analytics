import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PlayerInfo {
  playerId: number;
  playerName: string;
  color: string;
}

interface SelectedPlayersBarProps {
  players: PlayerInfo[];
  onRemovePlayer: (playerId: number) => void;
  onClearAll: () => void;
}

export function SelectedPlayersBar({
  players,
  onRemovePlayer,
  onClearAll,
}: SelectedPlayersBarProps) {
  if (players.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      {players.map((player) => (
        <Badge
          key={player.playerId}
          variant="secondary"
          className="gap-1 pl-2"
          style={{ borderLeftColor: player.color, borderLeftWidth: 3 }}
        >
          <Link
            to="/players/$id"
            params={{ id: String(player.playerId) }}
            className="hover:underline"
          >
            {player.playerName}
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 hover:bg-transparent ml-1"
            onClick={() => onRemovePlayer(player.playerId)}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}
      {players.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground"
          onClick={onClearAll}
        >
          Clear all
        </Button>
      )}
    </div>
  );
}
