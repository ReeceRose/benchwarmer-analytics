import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlayerDragCard } from "@/components/line-builder/PlayerDragCard";
import type { RosterPlayer } from "@/types";

interface RosterPanelProps {
  players: RosterPlayer[];
  usedPlayerIds: Set<number>;
  lineType: "forward" | "defense";
}

export function RosterPanel({ players, usedPlayerIds, lineType }: RosterPanelProps) {
  const [search, setSearch] = useState("");

  // Filter players based on line type being built
  const availablePlayers = useMemo(() => {
    return players.filter((p) => {
      // Exclude goalies
      if (p.position === "G") return false;
      // Exclude already used players
      if (usedPlayerIds.has(p.id)) return false;
      // Filter by search
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      // Auto-filter based on line type
      if (lineType === "forward") {
        return ["C", "L", "R", "LW", "RW", "W", "F"].includes(p.position ?? "");
      }
      return p.position === "D";
    });
  }, [players, usedPlayerIds, search, lineType]);

  // Sort by points (most productive first)
  const sortedPlayers = useMemo(() => {
    return [...availablePlayers].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
  }, [availablePlayers]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="mb-3 flex shrink-0 items-baseline justify-between">
        <h3 className="text-sm font-semibold">Available players</h3>
        <span className="text-xs text-muted-foreground tabular-nums">{sortedPlayers.length}</span>
      </div>

      <div className="relative mb-3 shrink-0">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search players…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-2 pr-3">
          {sortedPlayers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No available players</p>
              {search && (
                <p className="text-xs mt-1">Try a different search</p>
              )}
            </div>
          ) : (
            sortedPlayers.map((player) => (
              <PlayerDragCard key={player.id} player={player} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
