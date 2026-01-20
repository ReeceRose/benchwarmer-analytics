import { Link } from "@tanstack/react-router";
import { Flame, Snowflake, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import type { OutlierEntry } from "@/types";

interface OutlierListProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  players: OutlierEntry[];
  variant: "hot" | "cold";
}

function OutlierList({ title, description, icon, players, variant }: OutlierListProps) {
  const isHot = variant === "hot";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {players.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data available</p>
        ) : (
          players.slice(0, 5).map((player) => (
            <Link
              key={player.playerId}
              to="/players/$id"
              params={{ id: player.playerId.toString() }}
              className="flex items-center justify-between py-2 px-2 -mx-2 hover:bg-muted/50 rounded transition-colors"
            >
              <div className="flex flex-col">
                <span className="font-medium text-sm">{player.name}</span>
                <span className="text-xs text-muted-foreground">
                  {player.team} {player.position && `- ${player.position}`}
                </span>
              </div>
              <div className="flex items-center gap-3 text-right">
                <div className="flex flex-col items-end">
                  <span className="text-xs text-muted-foreground">G / xG</span>
                  <span className="font-mono text-sm">
                    {player.goals} / {player.expectedGoals.toFixed(1)}
                  </span>
                </div>
                <div
                  className={`flex items-center gap-1 font-mono text-sm ${
                    isHot
                      ? "text-green-600"
                      : "text-destructive"
                  }`}
                >
                  {isHot ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {isHot ? "+" : ""}
                  {player.differential.toFixed(1)}
                </div>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

interface OutliersSectionProps {
  runningHot: OutlierEntry[];
  runningCold: OutlierEntry[];
}

export function OutliersSection({ runningHot, runningCold }: OutliersSectionProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <OutlierList
        title="Running Hot"
        description="Outperforming expected goals (lucky or clutch?)"
        icon={<Flame className="h-4 w-4 text-destructive" />}
        players={runningHot}
        variant="hot"
      />
      <OutlierList
        title="Running Cold"
        description="Underperforming expected goals (due for positive regression)"
        icon={<Snowflake className="h-4 w-4 text-primary" />}
        players={runningCold}
        variant="cold"
      />
    </div>
  );
}
