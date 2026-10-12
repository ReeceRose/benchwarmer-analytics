import { GitCompare, X, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlayerSearchDropdown } from "@/components/compare/PlayerSearchDropdown";
import { getPlayerHeadshotUrl, getPlayerInitials } from "@/lib/player-headshots";
import type { Player, PlayerDetail } from "@/types";

interface SelectedPlayersCardProps {
  selectedIds: number[];
  selectedPlayers: (PlayerDetail | undefined)[] | undefined;
  playersLoading: boolean;
  selectedPositionType: "goalie" | "skater" | null;
  onAddPlayer: (player: Player) => void;
  onRemovePlayer: (playerId: number) => void;
  maxPlayers?: number;
}

export function SelectedPlayersCard({
  selectedIds,
  selectedPlayers,
  playersLoading,
  selectedPositionType,
  onAddPlayer,
  onRemovePlayer,
  maxPlayers = 5,
}: SelectedPlayersCardProps) {
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <GitCompare className="h-5 w-5" />
          Selected Players ({selectedIds.length}/{maxPlayers})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          {playersLoading && selectedIds.length > 0 && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {selectedPlayers
            ?.filter(
              (player): player is NonNullable<typeof player> => player != null
            )
            .map((player) => (
              <Badge
                key={player.id}
                variant="secondary"
                className="py-1.5 px-3 text-sm flex items-center gap-2"
              >
                <Avatar className="h-5 w-5">
                  <AvatarImage
                    src={getPlayerHeadshotUrl(player.id, player.currentTeamAbbreviation)}
                    alt={player.name}
                  />
                  <AvatarFallback className="text-[8px]">
                    {getPlayerInitials(player.name)}
                  </AvatarFallback>
                </Avatar>
                {player.name}
                {player.currentTeamAbbreviation && (
                  <span className="text-muted-foreground">
                    ({player.currentTeamAbbreviation})
                  </span>
                )}
                <button
                  onClick={() => onRemovePlayer(player.id)}
                  className="ml-1 hover:text-destructive"
                  aria-label={`Remove ${player.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}

          <PlayerSearchDropdown
            onAddPlayer={onAddPlayer}
            selectedIds={selectedIds}
            selectedPositionType={selectedPositionType}
            disabled={selectedIds.length >= maxPlayers}
          />
        </div>

        {selectedIds.length === 0 && (
          <p className="text-sm text-muted-foreground mt-3">
            Add at least 2 players to compare their statistics.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
