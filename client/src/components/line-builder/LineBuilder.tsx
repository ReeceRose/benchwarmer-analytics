import { useState, useMemo, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { RotateCcw, Users2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RosterPanel } from "@/components/line-builder/RosterPanel";
import { LineSlot } from "@/components/line-builder/LineSlot";
import { LineStatsPanel } from "@/components/line-builder/LineStatsPanel";
import { PlayerDragCard } from "@/components/line-builder/PlayerDragCard";
import type { RosterPlayer, ChemistryPair } from "@/types";

interface LineBuilderProps {
  roster: RosterPlayer[];
  chemistryPairs: ChemistryPair[];
}

type LineType = "forward" | "defense";

interface LineState {
  forward: {
    lw: RosterPlayer | null;
    c: RosterPlayer | null;
    rw: RosterPlayer | null;
  };
  defense: {
    ld: RosterPlayer | null;
    rd: RosterPlayer | null;
  };
}

const INITIAL_LINE_STATE: LineState = {
  forward: { lw: null, c: null, rw: null },
  defense: { ld: null, rd: null },
};

export function LineBuilder({ roster, chemistryPairs }: LineBuilderProps) {
  const [lineType, setLineType] = useState<LineType>("forward");
  const [lineState, setLineState] = useState<LineState>(INITIAL_LINE_STATE);
  const [activePlayer, setActivePlayer] = useState<RosterPlayer | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Get all used player IDs across both line types
  const usedPlayerIds = useMemo(() => {
    const ids = new Set<number>();
    Object.values(lineState.forward).forEach((p) => p && ids.add(p.id));
    Object.values(lineState.defense).forEach((p) => p && ids.add(p.id));
    return ids;
  }, [lineState]);

  // Get current line slots based on type
  const currentLine =
    lineType === "forward" ? lineState.forward : lineState.defense;

  // Get player IDs for current line
  const currentLinePlayerIds = useMemo(() => {
    return Object.values(currentLine)
      .filter((p): p is RosterPlayer => p !== null)
      .map((p) => p.id);
  }, [currentLine]);

  // Find chemistry pairs for current line
  const relevantPairs = useMemo(() => {
    if (currentLinePlayerIds.length < 2) return [];

    return chemistryPairs.filter((pair) => {
      const hasPlayer1 = currentLinePlayerIds.includes(pair.player1Id);
      const hasPlayer2 = currentLinePlayerIds.includes(pair.player2Id);
      return hasPlayer1 && hasPlayer2;
    });
  }, [chemistryPairs, currentLinePlayerIds]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const player = event.active.data.current?.player as
      | RosterPlayer
      | undefined;
    if (player) {
      setActivePlayer(player);
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActivePlayer(null);

    const { active, over } = event;
    if (!over) return;

    const player = active.data.current?.player as RosterPlayer | undefined;
    if (!player) return;

    const slotId = over.id as string;

    // Determine which line type and slot
    if (slotId.startsWith("forward-")) {
      const slot = slotId.replace("forward-", "") as "lw" | "c" | "rw";
      setLineState((prev) => ({
        ...prev,
        forward: {
          ...prev.forward,
          [slot]: player,
        },
      }));
    } else if (slotId.startsWith("defense-")) {
      const slot = slotId.replace("defense-", "") as "ld" | "rd";
      setLineState((prev) => ({
        ...prev,
        defense: {
          ...prev.defense,
          [slot]: player,
        },
      }));
    }
  }, []);

  const handleRemovePlayer = useCallback((lineType: LineType, slot: string) => {
    if (lineType === "forward") {
      setLineState((prev) => ({
        ...prev,
        forward: {
          ...prev.forward,
          [slot]: null,
        },
      }));
    } else {
      setLineState((prev) => ({
        ...prev,
        defense: {
          ...prev.defense,
          [slot]: null,
        },
      }));
    }
  }, []);

  const handleReset = useCallback(() => {
    setLineState(INITIAL_LINE_STATE);
  }, []);

  const playerCount = currentLinePlayerIds.length;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 border rounded-lg p-4 bg-card h-150">
          <RosterPanel players={roster} usedPlayerIds={usedPlayerIds} />
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <Tabs
              value={lineType}
              onValueChange={(v) => setLineType(v as LineType)}
            >
              <TabsList>
                <TabsTrigger value="forward" className="gap-2">
                  <Users2 className="h-4 w-4" />
                  Forward Line
                </TabsTrigger>
                <TabsTrigger value="defense" className="gap-2">
                  <Shield className="h-4 w-4" />
                  Defense Pair
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>

          <div className="border rounded-lg p-6 bg-card">
            {lineType === "forward" ? (
              <div className="grid grid-cols-3 gap-4">
                <LineSlot
                  id="forward-lw"
                  label="Left Wing"
                  player={lineState.forward.lw}
                  onRemove={() => handleRemovePlayer("forward", "lw")}
                />
                <LineSlot
                  id="forward-c"
                  label="Center"
                  player={lineState.forward.c}
                  onRemove={() => handleRemovePlayer("forward", "c")}
                />
                <LineSlot
                  id="forward-rw"
                  label="Right Wing"
                  player={lineState.forward.rw}
                  onRemove={() => handleRemovePlayer("forward", "rw")}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <LineSlot
                  id="defense-ld"
                  label="Left Defense"
                  player={lineState.defense.ld}
                  onRemove={() => handleRemovePlayer("defense", "ld")}
                />
                <LineSlot
                  id="defense-rd"
                  label="Right Defense"
                  player={lineState.defense.rd}
                  onRemove={() => handleRemovePlayer("defense", "rd")}
                />
              </div>
            )}
          </div>

          <LineStatsPanel
            pairStats={relevantPairs}
            playerCount={playerCount}
            isForwardLine={lineType === "forward"}
          />
        </div>
      </div>

      <DragOverlay>
        {activePlayer && (
          <div className="opacity-80">
            <PlayerDragCard player={activePlayer} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
