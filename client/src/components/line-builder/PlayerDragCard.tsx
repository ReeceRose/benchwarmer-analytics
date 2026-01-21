import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatPosition } from "@/lib/formatters";
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
      className={`
        flex items-center gap-2 p-2 rounded-md border bg-card
        ${isDragging ? "opacity-50 shadow-lg ring-2 ring-primary" : ""}
        ${isInSlot ? "w-full" : "hover:bg-muted/50 cursor-grab active:cursor-grabbing"}
      `}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={player.headshotUrl} alt={player.name} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{player.name}</div>
        {!isInSlot && player.points != null && (
          <div className="text-xs text-muted-foreground">
            {player.goals}G {player.assists}A ({player.points}P)
          </div>
        )}
      </div>
      {player.position && (
        <Badge variant="outline" className="shrink-0 text-xs">
          {formatPosition(player.position)}
        </Badge>
      )}
    </div>
  );
}
