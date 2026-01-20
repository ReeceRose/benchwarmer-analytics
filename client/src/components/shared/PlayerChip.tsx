import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PlayerChipProps {
  playerId: number;
  name: string;
  position?: string;
  headshotUrl?: string;
  /** Show position badge */
  showPosition?: boolean;
  /** Make the chip a link to player detail */
  linked?: boolean;
  /** Size variant */
  size?: "sm" | "md";
  className?: string;
}

export function PlayerChip({
  playerId,
  name,
  position,
  headshotUrl,
  showPosition = false,
  linked = true,
  size = "md",
  className,
}: PlayerChipProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const content = (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-muted px-2 py-1",
        size === "sm" ? "text-xs" : "text-sm",
        linked && "hover:bg-muted/80 transition-colors cursor-pointer",
        className
      )}
    >
      <Avatar className={cn(size === "sm" ? "h-5 w-5" : "h-6 w-6")}>
        {headshotUrl && <AvatarImage src={headshotUrl} alt={name} />}
        <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
      </Avatar>
      <span className="font-medium">{name}</span>
      {showPosition && position && (
        <Badge variant="outline" className="text-[10px] px-1 py-0">
          {position}
        </Badge>
      )}
    </span>
  );

  if (linked) {
    return (
      <Link to="/players/$id" params={{ id: playerId.toString() }}>
        {content}
      </Link>
    );
  }

  return content;
}
