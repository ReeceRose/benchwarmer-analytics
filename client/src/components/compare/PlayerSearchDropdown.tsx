import { useState } from "react";
import { Search, Plus, Loader2 } from "lucide-react";
import { usePlayerSearch } from "@/hooks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatPosition } from "@/lib/formatters";
import type { Player } from "@/types";

interface PlayerSearchDropdownProps {
  onAddPlayer: (player: Player) => void;
  selectedIds: number[];
  selectedPositionType: "goalie" | "skater" | null;
  disabled?: boolean;
}

export function PlayerSearchDropdown({
  onAddPlayer,
  selectedIds,
  selectedPositionType,
  disabled = false,
}: PlayerSearchDropdownProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const { data: searchResults, isLoading: searchLoading } = usePlayerSearch(
    searchQuery,
    1,
    10
  );

  // Filter search results to exclude already selected players and match position type
  const filteredResults =
    searchResults?.players?.filter((p) => {
      if (selectedIds.includes(p.id)) return false;
      if (!selectedPositionType) return true;
      const isGoalie = p.position === "G";
      return selectedPositionType === "goalie" ? isGoalie : !isGoalie;
    }) ?? [];

  const handleAddPlayer = (player: Player) => {
    onAddPlayer(player);
    setSearchQuery("");
    setShowSearch(false);
  };

  const handleCancel = () => {
    setShowSearch(false);
    setSearchQuery("");
  };

  if (disabled) return null;

  return (
    <div className="relative">
      {showSearch ? (
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-48"
              autoFocus
            />
          </div>
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowSearch(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Player
        </Button>
      )}

      {/* Search Results Dropdown */}
      {showSearch && searchQuery.length >= 2 && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-popover border rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
          {searchLoading ? (
            <div className="p-4 flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : filteredResults.length > 0 ? (
            filteredResults.map((player) => (
              <button
                key={player.id}
                onClick={() => handleAddPlayer(player)}
                className="w-full px-3 py-2 text-left hover:bg-muted flex items-center justify-between"
              >
                <span>{player.name}</span>
                <span className="text-xs text-muted-foreground">
                  {player.position && formatPosition(player.position)}{" "}
                  {player.currentTeamAbbreviation &&
                    `• ${player.currentTeamAbbreviation}`}
                </span>
              </button>
            ))
          ) : (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No players found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
