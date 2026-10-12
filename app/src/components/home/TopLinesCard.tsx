import { Link } from "@tanstack/react-router";
import { Users, ChevronRight } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-success" />
            Hot Lines (5v5)
          </CardTitle>
          <CardDescription>No line data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-success" />
          Hot Lines (5v5)
        </CardTitle>
        <CardDescription>
          Top performing line combinations by xG%
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {lines.slice(0, 5).map((line, index) => (
          <Link
            key={line.id}
            to="/teams/$abbrev/lines"
            params={{ abbrev: line.team }}
            search={{ season }}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-3 hover:bg-muted/50 rounded-lg transition-colors group"
          >
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-mono text-xs w-4">
                #{index + 1}
              </span>
              <Badge variant="outline" className="text-xs">
                {line.team}
              </Badge>
              <div className="flex -space-x-1.5">
                {line.players.map((player) => (
                  <Avatar
                    key={player.playerId}
                    className="h-7 w-7 border-2 border-background"
                  >
                    <AvatarImage
                      src={getPlayerHeadshotUrl(player.playerId, line.team)}
                      alt={player.name}
                    />
                    <AvatarFallback className="text-[8px]">
                      {getPlayerInitials(player.name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
            </div>

            <div className="flex flex-col min-w-0">
              {line.players.map((player) => (
                <span
                  key={player.playerId}
                  className="text-xs text-muted-foreground truncate"
                >
                  {player.name}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="text-center">
                <div className="font-mono text-sm font-medium text-success">
                  {line.expectedGoalsPct != null
                    ? formatPercent(line.expectedGoalsPct, false)
                    : "—"}
                </div>
                <div className="text-[10px] text-muted-foreground">xG%</div>
              </div>
              <div className="text-center hidden sm:block">
                <div className="font-mono text-sm">
                  {line.goalsFor}/{line.goalsAgainst}
                </div>
                <div className="text-[10px] text-muted-foreground">GF/GA</div>
              </div>
              <div className="text-center hidden sm:block">
                <div className="font-mono text-sm">
                  {formatToi(line.iceTimeSeconds)}
                </div>
                <div className="text-[10px] text-muted-foreground">TOI</div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
