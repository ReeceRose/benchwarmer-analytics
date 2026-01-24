import { Link } from "@tanstack/react-router";
import { Users, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatToi, formatPercent } from "@/lib/formatters";
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
            <Users className="h-5 w-5 text-emerald-500" />
            Hot Lines
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
          <Users className="h-5 w-5 text-emerald-500" />
          Hot Lines
        </CardTitle>
        <CardDescription>Top performing line combinations by xG%</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {lines.slice(0, 5).map((line, index) => (
          <Link
            key={line.id}
            to="/teams/$abbrev/lines"
            params={{ abbrev: line.team }}
            search={{ season }}
            className="block p-3 -mx-3 hover:bg-muted/50 rounded-lg transition-colors group"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-muted-foreground font-mono text-xs">
                    #{index + 1}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {line.team}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {line.players.map((player, i) => (
                    <span
                      key={player.playerId}
                      className="text-sm"
                    >
                      {player.name}
                      {i < line.players.length - 1 && (
                        <span className="text-muted-foreground mx-1">-</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4 text-right shrink-0">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">xG%</span>
                  <span className="font-mono text-sm font-medium">
                    {line.expectedGoalsPct != null ? formatPercent(line.expectedGoalsPct, false) : "—"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">GF/GA</span>
                  <span className="font-mono text-sm">
                    {line.goalsFor}/{line.goalsAgainst}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">TOI</span>
                  <span className="font-mono text-sm">
                    {formatToi(line.iceTimeSeconds)}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
