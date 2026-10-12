import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatPositionShort } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { RosterPlayer } from "@/types";

interface PlayerDragCardProps {
  player: RosterPlayer;
  isInSlot?: boolean;
}

export function PlayerDragCard({ player, isInSlot = false }: PlayerDragCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `player-${player.id}`,
    data: { player },
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 50 : undefined,
      }
    : undefined;

  const initials = player.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2.5 rounded-xl border bg-card px-2 py-1.5",
        isDragging && "opacity-50 shadow-lg shadow-black/5 ring-2 ring-primary",
        isInSlot ? "w-full" : "cursor-grab hover:bg-muted/60 active:cursor-grabbing"
      )}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-4 shrink-0 text-muted-foreground" />
      <Avatar className="size-8 shrink-0">
        <AvatarImage src={player.headshotUrl} alt={player.name} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="truncate text-sm font-medium">{player.name}</div>
        {!isInSlot && player.points != null && (
          <div className="text-xs text-muted-foreground tabular-nums">
            {player.goals} G · {player.assists} A · {player.points} P
          </div>
        )}
      </div>
      {player.position && (
        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold">
          {formatPositionShort(player.position)}
        </span>
      )}
    </div>
  );
}
