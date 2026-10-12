import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { usePlayerSearch } from "@/hooks";

interface PlayerSearchDropdownProps {
  selectedPlayerIds: number[];
  maxPlayers?: number;
  onSelectPlayer: (playerId: number) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function PlayerSearchDropdown({
  selectedPlayerIds,
  maxPlayers = 5,
  onSelectPlayer,
  placeholder = "Search players...",
  disabled = false,
}: PlayerSearchDropdownProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: searchResults, isLoading: searchLoading } = usePlayerSearch(
    searchQuery,
    1,
    10,
  );

  const availableResults =
    searchResults?.players?.filter(
      (player) => !selectedPlayerIds.includes(player.id),
    ) ?? [];

  const isMaxReached = selectedPlayerIds.length >= maxPlayers;
  const effectivePlaceholder = isMaxReached
    ? `Max ${maxPlayers} players`
    : placeholder;

  const handleSelect = (playerId: number) => {
    setSearchQuery("");
    if (!selectedPlayerIds.includes(playerId) && !isMaxReached) {
      onSelectPlayer(playerId);
    }
  };

  return (
    <div className="flex-1 min-w-50 max-w-md relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder={effectivePlaceholder}
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setSearchQuery(e.target.value)
          }
          className="pl-9 h-9"
          disabled={disabled || isMaxReached}
        />
      </div>
      {searchQuery.length >= 2 && (
        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border bg-popover p-1 shadow-lg shadow-black/5">
          {searchLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : availableResults.length > 0 ? (
            availableResults.map((player) => (
              <button
                key={player.id}
                onClick={() => handleSelect(player.id)}
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm hover:bg-accent"
              >
                <span>{player.name}</span>
                <span className="text-muted-foreground text-xs">
                  {player.currentTeamAbbreviation}
                </span>
              </button>
            ))
          ) : (
            <p className="p-4 text-center text-sm text-muted-foreground">
              No players match "{searchQuery}"
            </p>
          )}
        </div>
      )}
    </div>
  );
}
