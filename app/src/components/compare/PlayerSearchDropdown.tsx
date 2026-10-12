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
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search players…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-52 pl-9"
              autoFocus
            />
          </div>
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowSearch(true)}>
          <Plus />
          Add player
        </Button>
      )}

      {showSearch && searchQuery.length >= 2 && (
        <div className="absolute top-full left-0 z-50 mt-1 max-h-64 w-64 overflow-y-auto rounded-xl border bg-popover p-1 shadow-lg shadow-black/5">
          {searchLoading ? (
            <div className="p-4 flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : filteredResults.length > 0 ? (
            filteredResults.map((player) => (
              <button
                key={player.id}
                onClick={() => handleAddPlayer(player)}
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm hover:bg-accent"
              >
                <span>{player.name}</span>
                <span className="text-xs text-muted-foreground">
                  {player.position && formatPosition(player.position)}{" "}
                  {player.currentTeamAbbreviation &&
                    `· ${player.currentTeamAbbreviation}`}
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
