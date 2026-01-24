import { useState } from "react";
import { Search } from "lucide-react";
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
  const { data: searchResults } = usePlayerSearch(searchQuery, 1, 10);

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
    <div className="flex-1 min-w-[200px] max-w-md relative">
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
      {searchQuery.length >= 2 &&
        searchResults?.players &&
        searchResults.players.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
            {searchResults.players
              .filter((player) => !selectedPlayerIds.includes(player.id))
              .map((player) => (
                <button
                  key={player.id}
                  onClick={() => handleSelect(player.id)}
                  className="w-full px-3 py-2 text-left hover:bg-muted text-sm flex justify-between items-center"
                >
                  <span>{player.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {player.currentTeamAbbreviation}
                  </span>
                </button>
              ))}
          </div>
        )}
    </div>
  );
}
