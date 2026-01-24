import { Link } from "@tanstack/react-router";
import { Flame, Snowflake, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import type { OutlierEntry, GoalieOutlierEntry } from "@/types";

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
                      ? "text-success"
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

interface GoalieOutlierListProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  goalies: GoalieOutlierEntry[];
  variant: "hot" | "cold";
}

function GoalieOutlierList({ title, description, icon, goalies, variant }: GoalieOutlierListProps) {
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
        {goalies.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data available</p>
        ) : (
          goalies.slice(0, 5).map((goalie) => (
            <Link
              key={goalie.playerId}
              to="/players/$id"
              params={{ id: goalie.playerId.toString() }}
              className="flex items-center justify-between py-2 px-2 -mx-2 hover:bg-muted/50 rounded transition-colors"
            >
              <div className="flex flex-col">
                <span className="font-medium text-sm">{goalie.name}</span>
                <span className="text-xs text-muted-foreground">
                  {goalie.team} - G
                </span>
              </div>
              <div className="flex items-center gap-3 text-right">
                <div className="flex flex-col items-end">
                  <span className="text-xs text-muted-foreground">GA / xGA</span>
                  <span className="font-mono text-sm">
                    {goalie.goalsAgainst} / {goalie.expectedGoalsAgainst.toFixed(1)}
                  </span>
                </div>
                <div
                  className={`flex items-center gap-1 font-mono text-sm ${
                    isHot
                      ? "text-success"
                      : "text-destructive"
                  }`}
                >
                  {isHot ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {isHot ? "+" : ""}
                  {goalie.goalsSavedAboveExpected.toFixed(1)}
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
  goalieRunningHot?: GoalieOutlierEntry[];
  goalieRunningCold?: GoalieOutlierEntry[];
}

export function OutliersSection({ runningHot, runningCold, goalieRunningHot, goalieRunningCold }: OutliersSectionProps) {
  const hasGoalieOutliers = goalieRunningHot && goalieRunningCold &&
    (goalieRunningHot.length > 0 || goalieRunningCold.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Skaters</h3>
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
      </div>
      {hasGoalieOutliers && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Goalies</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <GoalieOutlierList
              title="Running Hot"
              description="Saving more goals than expected (lucky or elite?)"
              icon={<Flame className="h-4 w-4 text-destructive" />}
              goalies={goalieRunningHot!}
              variant="hot"
            />
            <GoalieOutlierList
              title="Running Cold"
              description="Allowing more goals than expected (due for positive regression)"
              icon={<Snowflake className="h-4 w-4 text-primary" />}
              goalies={goalieRunningCold!}
              variant="cold"
            />
          </div>
        </div>
      )}
    </div>
  );
}
