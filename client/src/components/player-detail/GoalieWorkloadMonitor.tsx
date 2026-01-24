import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Activity, TrendingDown, Calendar } from "lucide-react";
import { useGoalieWorkload } from "@/hooks";
import {
  WorkloadWindowCard,
  BackToBackSplitsDisplay,
  ShotsAgainstChart,
  SavePercentageChart,
} from "@/components/goalie-workload";
import type { GoalieGameStats } from "@/types";

interface GoalieWorkloadMonitorProps {
  playerId: number;
  season: number;
}

const GAME_LIMITS = [
  { value: "10", label: "Last 10 Games" },
  { value: "20", label: "Last 20 Games" },
  { value: "30", label: "Last 30 Games" },
];

const TREND_CONFIG = {
  heavy: {
    icon: AlertTriangle,
    color: "text-orange-500",
    bg: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    label: "Heavy Workload",
  },
  moderate: {
    icon: Activity,
    color: "text-blue-500",
    bg: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    label: "Moderate",
  },
  light: {
    icon: TrendingDown,
    color: "text-green-500",
    bg: "bg-green-500/10 text-green-600 border-green-500/20",
    label: "Light",
  },
};

export function GoalieWorkloadMonitor({
  playerId,
  season,
}: GoalieWorkloadMonitorProps) {
  const [gameLimit, setGameLimit] = useState("10");

  const { data, isLoading } = useGoalieWorkload(
    playerId,
    season,
    parseInt(gameLimit)
  );

  const chartData = useMemo(() => {
    if (!data?.games) return [];
    return data.games.map((game: GoalieGameStats, index: number) => ({
      game: index + 1,
      gameId: game.gameId,
      date: game.gameDate,
      opponent: game.opponent,
      shotsAgainst: game.shotsAgainst,
      savePercentage: game.savePercentage,
      gsax: game.goalsSavedAboveExpected,
      isB2B: game.isBackToBack,
    }));
  }, [data]);

  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Workload Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.gamesIncluded < 3) {
    return null;
  }

  const trend = TREND_CONFIG[data.workloadTrend];
  const TrendIcon = trend.icon;

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <CardTitle className="text-base font-semibold">
            Workload Monitor
          </CardTitle>
          <Badge variant="outline" className={trend.bg}>
            <TrendIcon className={`h-3 w-3 mr-1 ${trend.color}`} />
            {trend.label}
          </Badge>
        </div>
        <Select value={gameLimit} onValueChange={setGameLimit}>
          <SelectTrigger className="w-40 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GAME_LIMITS.map((w) => (
              <SelectItem key={w.value} value={w.value}>
                {w.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <WorkloadWindowCard window={data.last7Days} />
          <WorkloadWindowCard window={data.last14Days} />
          <WorkloadWindowCard window={data.last30Days} />
        </div>

        <ShotsAgainstChart data={chartData} />
        <SavePercentageChart data={chartData} />

        {data.backToBackSplits.backToBackGames > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Back-to-Back Performance
            </h4>
            <BackToBackSplitsDisplay splits={data.backToBackSplits} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
