import { Link } from "@tanstack/react-router";
import { Star, Target, TrendingUp, BarChart3, Clock, ChevronRight, Shield, Goal, Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatToi } from "@/lib/formatters";
import type { Leaderboards, GoalieLeaderboards, LeaderEntry } from "@/types";

interface LeaderCardProps {
  title: string;
  icon: React.ReactNode;
  leaders: LeaderEntry[];
  formatValue: (value: number) => string;
  statKey: string;
}

function LeaderCard({ title, icon, leaders, formatValue }: LeaderCardProps) {
  if (!leaders || leaders.length === 0) {
    return (
      <Card className="min-w-70 shrink-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="min-w-70 shrink-0 hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {icon}
          {title}
          <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {leaders.slice(0, 3).map((player, index) => (
          <Link
            key={player.playerId}
            to="/players/$id"
            params={{ id: player.playerId.toString() }}
            className="flex items-center justify-between py-1 hover:bg-muted/50 rounded px-1 -mx-1 transition-colors"
          >
            <span className="flex items-center gap-2">
              <span className="text-muted-foreground font-mono text-xs w-4">
                {index + 1}.
              </span>
              <span className="font-medium text-sm">{player.name}</span>
              {player.team && (
                <span className="text-xs text-muted-foreground">
                  ({player.team})
                </span>
              )}
            </span>
            <span className="font-mono text-sm tabular-nums">
              {formatValue(player.value)}
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

interface LeaderStripProps {
  leaders: Leaderboards;
  goalieLeaders?: GoalieLeaderboards;
}

function formatSavePct(value: number): string {
  return value >= 1 ? value.toFixed(3) : `.${(value * 1000).toFixed(0)}`;
}

function formatGaa(value: number): string {
  return value.toFixed(2);
}

function formatGsax(value: number): string {
  return value >= 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
}

export function LeaderStrip({ leaders, goalieLeaders }: LeaderStripProps) {
  const skaterCategories = [
    {
      key: "points",
      title: "Points",
      icon: <Star className="h-4 w-4 text-primary" />,
      data: leaders.points,
      format: (v: number) => v.toString(),
    },
    {
      key: "goals",
      title: "Goals",
      icon: <Target className="h-4 w-4 text-destructive" />,
      data: leaders.goals,
      format: (v: number) => v.toString(),
    },
    {
      key: "expectedGoals",
      title: "Expected Goals",
      icon: <TrendingUp className="h-4 w-4 text-muted-foreground" />,
      data: leaders.expectedGoals,
      format: (v: number) => v.toFixed(1),
    },
    {
      key: "corsiPct",
      title: "Corsi %",
      icon: <BarChart3 className="h-4 w-4 text-muted-foreground" />,
      data: leaders.corsiPct,
      format: (v: number) => `${v.toFixed(1)}%`,
    },
    {
      key: "iceTime",
      title: "Ice Time",
      icon: <Clock className="h-4 w-4 text-muted-foreground" />,
      data: leaders.iceTime,
      format: (v: number) => formatToi(v),
    },
  ];

  const goalieCategories = goalieLeaders ? [
    {
      key: "savePct",
      title: "Save %",
      icon: <Shield className="h-4 w-4 text-blue-500" />,
      data: goalieLeaders.savePct,
      format: formatSavePct,
    },
    {
      key: "gaa",
      title: "GAA",
      icon: <Goal className="h-4 w-4 text-red-500" />,
      data: goalieLeaders.goalsAgainstAvg,
      format: formatGaa,
    },
    {
      key: "gsax",
      title: "GSAx",
      icon: <Sparkles className="h-4 w-4 text-yellow-500" />,
      data: goalieLeaders.goalsSavedAboveExpected,
      format: formatGsax,
    },
  ] : [];

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex gap-4 min-w-max">
        {skaterCategories.map((cat) => (
          <LeaderCard
            key={cat.key}
            title={cat.title}
            icon={cat.icon}
            leaders={cat.data}
            formatValue={cat.format}
            statKey={cat.key}
          />
        ))}
        {goalieCategories.map((cat) => (
          <LeaderCard
            key={cat.key}
            title={cat.title}
            icon={cat.icon}
            leaders={cat.data}
            formatValue={cat.format}
            statKey={cat.key}
          />
        ))}
      </div>
    </div>
  );
}
