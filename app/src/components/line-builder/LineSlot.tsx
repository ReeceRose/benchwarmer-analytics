import { useDroppable } from "@dnd-kit/core";
import { X } from "lucide-react";
import { PlayerDragCard } from "@/components/line-builder/PlayerDragCard";
import { cn } from "@/lib/utils";
import type { RosterPlayer } from "@/types";

interface LineSlotProps {
  id: string;
  label: string;
  player: RosterPlayer | null;
  onRemove: () => void;
  acceptedPositions?: string[];
}

export function LineSlot({
  id,
  label,
  player,
  onRemove,
  acceptedPositions,
}: LineSlotProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: { acceptedPositions },
  });

  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-16 rounded-xl transition-colors",
          player
            ? "p-0"
            : cn(
                "border-2 border-dashed p-2",
                isOver ? "border-foreground/40 bg-muted" : "border-border"
              )
        )}
      >
        {player ? (
          <div className="relative group">
            <PlayerDragCard player={player} isInSlot />
            <button
              type="button"
              aria-label={`Remove ${player.name}`}
              className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-background opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              onClick={onRemove}
            >
              <X className="size-3" />
            </button>
          </div>
        ) : (
          <div className="flex h-12 items-center justify-center text-sm text-muted-foreground">
            Drop a player here
          </div>
        )}
      </div>
    </div>
  );
}
