import { Link } from "@tanstack/react-router";
import { Star, Target, TrendingUp, BarChart3, Clock, ChevronRight, Shield, Goal, Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatToi, formatSavePct, formatPercent } from "@/lib/formatters";
import { getPlayerHeadshotUrl, getPlayerInitials } from "@/lib/player-headshots";
import type { Leaderboards, GoalieLeaderboards, LeaderEntry, LeaderboardCategory } from "@/types";

interface LeaderCardProps {
  title: string;
  icon: React.ReactNode;
  leaders: LeaderEntry[];
  formatValue: (value: number) => string;
  statKey: LeaderboardCategory;
  season?: number;
  situation?: string;
}

function LeaderCard({ title, icon, leaders, formatValue, statKey, season, situation }: LeaderCardProps) {
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
        <Link
          to="/leaderboards"
          search={{ category: statKey, season, situation }}
          className="flex items-center gap-2 hover:text-primary transition-colors group"
        >
          <CardTitle className="text-sm font-medium flex items-center gap-2 w-full">
            {icon}
            {title}
            <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
          </CardTitle>
        </Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {leaders.slice(0, 3).map((player, index) => (
          <Link
            key={player.playerId}
            to="/players/$id"
            params={{ id: player.playerId.toString() }}
            className="flex items-center justify-between gap-3 py-1 hover:bg-muted/50 rounded px-1 -mx-1 transition-colors"
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="text-muted-foreground font-mono text-xs w-4 shrink-0">
                {index + 1}.
              </span>
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarImage
                  src={getPlayerHeadshotUrl(player.playerId, player.team)}
                  alt={player.name}
                />
                <AvatarFallback className="text-[10px]">
                  {getPlayerInitials(player.name)}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-sm truncate">{player.name}</span>
              {player.team && (
                <span className="text-xs text-muted-foreground shrink-0">
                  ({player.team})
                </span>
              )}
            </span>
            <span className="font-mono text-sm tabular-nums shrink-0">
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
  season?: number;
  situation?: string;
}

function formatGaa(value: number): string {
  return value.toFixed(2);
}

function formatGsax(value: number): string {
  return value >= 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
}

export function LeaderStrip({ leaders, goalieLeaders, season, situation }: LeaderStripProps) {
  const skaterCategories: Array<{
    key: LeaderboardCategory;
    title: string;
    icon: React.ReactNode;
    data: LeaderEntry[];
    format: (v: number) => string;
  }> = [
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
      format: (v: number) => formatPercent(v, false),
    },
    {
      key: "iceTime",
      title: "Ice Time",
      icon: <Clock className="h-4 w-4 text-muted-foreground" />,
      data: leaders.iceTime,
      format: (v: number) => formatToi(v),
    },
  ];

  const goalieCategories: Array<{
    key: LeaderboardCategory;
    title: string;
    icon: React.ReactNode;
    data: LeaderEntry[];
    format: (v: number) => string;
  }> = goalieLeaders ? [
    {
      key: "savePct",
      title: "Save %",
      icon: <Shield className="h-4 w-4 text-cold" />,
      data: goalieLeaders.savePct,
      format: formatSavePct,
    },
    {
      key: "gaa",
      title: "GAA",
      icon: <Goal className="h-4 w-4 text-error" />,
      data: goalieLeaders.goalsAgainstAvg,
      format: formatGaa,
    },
    {
      key: "gsax",
      title: "GSAx",
      icon: <Sparkles className="h-4 w-4 text-highlight" />,
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
            season={season}
            situation={situation}
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
            season={season}
            situation={situation}
          />
        ))}
      </div>
    </div>
  );
}
