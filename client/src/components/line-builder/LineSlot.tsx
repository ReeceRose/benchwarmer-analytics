import { useDroppable } from "@dnd-kit/core";
import { User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlayerDragCard } from "@/components/line-builder/PlayerDragCard";
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
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </div>
      <div
        ref={setNodeRef}
        className={`
          min-h-16 rounded-lg border-2 border-dashed p-2 transition-colors
          ${isOver ? "border-primary bg-primary/10" : "border-muted-foreground/30"}
          ${player ? "border-solid border-border bg-card" : ""}
        `}
      >
        {player ? (
          <div className="relative group">
            <PlayerDragCard player={player} isInSlot />
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-1 -right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={onRemove}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center h-12 text-muted-foreground">
            <User className="h-5 w-5 mr-2" />
            <span className="text-sm">Drop player here</span>
          </div>
        )}
      </div>
    </div>
  );
}
