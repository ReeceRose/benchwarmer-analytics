import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TeamLogo } from "@/components/team-detail/TeamLogo";
import { formatToi, formatPercent } from "@/lib/formatters";
import {
  getPlayerHeadshotUrl,
  getPlayerInitials,
} from "@/lib/player-headshots";
import type { TopLine } from "@/types";

interface TopLinesCardProps {
  lines: TopLine[];
  season?: number;
}

export function TopLinesCard({ lines, season }: TopLinesCardProps) {
  if (!lines || lines.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No lines have enough ice time together yet.
      </p>
    );
  }

  return (
    <div>
      {lines.slice(0, 5).map((line) => (
        <Link
          key={line.id}
          to="/teams/$abbrev/lines"
          params={{ abbrev: line.team }}
          search={{ season }}
          className="group grid grid-cols-[auto_auto_1fr_auto] items-center gap-3 border-t py-3 first:border-t-0 first:pt-0"
        >
          <TeamLogo abbrev={line.team} size="md" />
          <div className="flex -space-x-2">
            {line.players.map((player) => (
              <Avatar
                key={player.playerId}
                className="size-8 border-2 border-card bg-accent"
              >
                <AvatarImage
                  src={getPlayerHeadshotUrl(player.playerId, line.team)}
                  alt=""
                  className="object-cover"
                />
                <AvatarFallback className="text-[9px]">
                  {getPlayerInitials(player.name)}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          <div className="min-w-0 text-sm leading-snug">
            <div className="truncate font-medium group-hover:text-link">
              {line.players.map((p) => p.name.split(" ").slice(-1)[0]).join(" – ")}
            </div>
            <div className="text-xs text-muted-foreground tabular-nums">
              {formatToi(line.iceTimeSeconds)} together · {line.goalsFor}–
              {line.goalsAgainst} goals
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-xl font-bold tabular-nums text-success">
              {line.expectedGoalsPct != null
                ? formatPercent(line.expectedGoalsPct)
                : "–"}
            </div>
            <div className="text-[11px] text-muted-foreground">xG share</div>
          </div>
        </Link>
      ))}
    </div>
  );
}
