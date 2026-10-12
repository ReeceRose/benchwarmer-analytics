import { X, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Panel, Section } from "@/components/layout";
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
    <Section
      title="Players"
      description={`${selectedIds.length} of ${maxPlayers}. Skaters and goalies can't be mixed.`}
    >
      <Panel className="flex flex-wrap items-center gap-2">
        {playersLoading && selectedIds.length > 0 && (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        )}
        {selectedPlayers
          ?.filter((player): player is NonNullable<typeof player> => player != null)
          .map((player) => (
            <span
              key={player.id}
              className="inline-flex items-center gap-2 rounded-full bg-muted py-1 pr-1.5 pl-1 text-sm"
            >
              <Avatar className="size-6">
                <AvatarImage
                  src={getPlayerHeadshotUrl(player.id, player.currentTeamAbbreviation)}
                  alt={player.name}
                />
                <AvatarFallback className="text-[10px]">
                  {getPlayerInitials(player.name)}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{player.name}</span>
              {player.currentTeamAbbreviation && (
                <span className="text-xs text-muted-foreground">
                  {player.currentTeamAbbreviation}
                </span>
              )}
              <button
                type="button"
                onClick={() => onRemovePlayer(player.id)}
                className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                aria-label={`Remove ${player.name}`}
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}

        <PlayerSearchDropdown
          onAddPlayer={onAddPlayer}
          selectedIds={selectedIds}
          selectedPositionType={selectedPositionType}
          disabled={selectedIds.length >= maxPlayers}
        />

        {selectedIds.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Add at least two players to compare them.
          </p>
        )}
      </Panel>
    </Section>
  );
}
