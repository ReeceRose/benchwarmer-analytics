import { useState, useMemo } from "react";
import { Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlayerDragCard } from "@/components/line-builder/PlayerDragCard";
import type { RosterPlayer } from "@/types";

interface RosterPanelProps {
  players: RosterPlayer[];
  usedPlayerIds: Set<number>;
}

type PositionTab = "all" | "F" | "D";

export function RosterPanel({ players, usedPlayerIds }: RosterPanelProps) {
  const [search, setSearch] = useState("");
  const [positionTab, setPositionTab] = useState<PositionTab>("all");

  // Filter out goalies and used players
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
      // Filter by position tab
      if (positionTab === "F") {
        return ["C", "L", "R", "LW", "RW", "W"].includes(p.position ?? "");
      }
      if (positionTab === "D") {
        return p.position === "D";
      }
      return true;
    });
  }, [players, usedPlayerIds, search, positionTab]);

  // Sort by points (most productive first)
  const sortedPlayers = useMemo(() => {
    return [...availablePlayers].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
  }, [availablePlayers]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold">Available Players</h3>
        <span className="text-sm text-muted-foreground">
          ({sortedPlayers.length})
        </span>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search players..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      <Tabs
        value={positionTab}
        onValueChange={(v) => setPositionTab(v as PositionTab)}
        className="mb-3"
      >
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1">
            All
          </TabsTrigger>
          <TabsTrigger value="F" className="flex-1">
            Forwards
          </TabsTrigger>
          <TabsTrigger value="D" className="flex-1">
            Defense
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <ScrollArea className="flex-1">
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
