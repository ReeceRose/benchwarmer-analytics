import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
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
import { CHART_AXIS_COLORS, CHART_GRADIENT_COLORS } from "@/lib/chart-colors";
import { formatSavePct } from "@/lib/formatters";
import type {
  GoalieGameStats,
  WorkloadWindow,
  BackToBackSplits,
} from "@/types";

interface GoalieWorkloadMonitorProps {
  playerId: number;
  season: number;
}

const GAME_LIMITS = [
  { value: "10", label: "Last 10 Games" },
  { value: "20", label: "Last 20 Games" },
  { value: "30", label: "Last 30 Games" },
];

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
    // Games come from API in descending order (newest first)
    // Keep that order so latest game is on left (G1)
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

  const trendConfig = {
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

  const trend = trendConfig[data.workloadTrend];
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

        <div>
          <h4 className="text-sm font-medium mb-2">Shots Against Trend</h4>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="saGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={CHART_GRADIENT_COLORS.danger}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={CHART_GRADIENT_COLORS.danger}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={CHART_AXIS_COLORS.grid}
                  strokeOpacity={CHART_AXIS_COLORS.gridOpacity}
                />
                <XAxis
                  dataKey="game"
                  tick={{ fill: CHART_AXIS_COLORS.tick, fontSize: 10 }}
                  tickFormatter={(v) => `G${v}`}
                  stroke={CHART_AXIS_COLORS.grid}
                  strokeOpacity={CHART_AXIS_COLORS.gridOpacity}
                />
                <YAxis
                  tick={{ fill: CHART_AXIS_COLORS.tick, fontSize: 10 }}
                  width={30}
                  stroke={CHART_AXIS_COLORS.grid}
                  strokeOpacity={CHART_AXIS_COLORS.gridOpacity}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
                        <p className="font-semibold">
                          vs {d.opponent} {d.isB2B && "(B2B)"}
                        </p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 text-xs">
                          <span className="text-muted-foreground">SA:</span>
                          <span>{d.shotsAgainst}</span>
                          <span className="text-muted-foreground">SV%:</span>
                          <span>{formatSavePct(d.savePercentage)}</span>
                          <span className="text-muted-foreground">GSAx:</span>
                          <span>{d.gsax.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  }}
                />
                <ReferenceLine
                  y={30}
                  stroke={CHART_GRADIENT_COLORS.danger}
                  strokeDasharray="5 5"
                  label={{
                    value: "High (30)",
                    position: "right",
                    fontSize: 9,
                    fill: CHART_GRADIENT_COLORS.danger,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="shotsAgainst"
                  stroke={CHART_GRADIENT_COLORS.danger}
                  strokeWidth={2}
                  fill="url(#saGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2">Save Percentage Trend</h4>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="svPctGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={CHART_GRADIENT_COLORS.primary}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={CHART_GRADIENT_COLORS.primary}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={CHART_AXIS_COLORS.grid}
                  strokeOpacity={CHART_AXIS_COLORS.gridOpacity}
                />
                <XAxis
                  dataKey="game"
                  tick={{ fill: CHART_AXIS_COLORS.tick, fontSize: 10 }}
                  tickFormatter={(v) => `G${v}`}
                  stroke={CHART_AXIS_COLORS.grid}
                  strokeOpacity={CHART_AXIS_COLORS.gridOpacity}
                />
                <YAxis
                  tick={{ fill: CHART_AXIS_COLORS.tick, fontSize: 10 }}
                  width={45}
                  domain={[0.85, 1.0]}
                  tickFormatter={(v) => v.toFixed(3)}
                  stroke={CHART_AXIS_COLORS.grid}
                  strokeOpacity={CHART_AXIS_COLORS.gridOpacity}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
                        <p className="font-semibold">
                          vs {d.opponent} {d.isB2B && "(B2B)"}
                        </p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 text-xs">
                          <span className="text-muted-foreground">SV%:</span>
                          <span className="font-medium">
                            {formatSavePct(d.savePercentage)}
                          </span>
                          <span className="text-muted-foreground">SA:</span>
                          <span>{d.shotsAgainst}</span>
                          <span className="text-muted-foreground">GSAx:</span>
                          <span>{d.gsax.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  }}
                />
                <ReferenceLine
                  y={0.91}
                  stroke={CHART_AXIS_COLORS.tick}
                  strokeDasharray="5 5"
                  label={{
                    value: "Avg (.910)",
                    position: "right",
                    fontSize: 9,
                    fill: CHART_AXIS_COLORS.tick,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="savePercentage"
                  stroke={CHART_GRADIENT_COLORS.primary}
                  strokeWidth={2}
                  dot={{
                    fill: CHART_GRADIENT_COLORS.primary,
                    strokeWidth: 0,
                    r: 3,
                  }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

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

function WorkloadWindowCard({ window }: { window: WorkloadWindow }) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        window.isHighWorkload
          ? "border-orange-500/50 bg-orange-500/5"
          : "border-border"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">
          Last {window.days} days
        </span>
        {window.isHighWorkload && (
          <AlertTriangle className="h-3 w-3 text-orange-500" />
        )}
      </div>
      <div className="text-xl font-bold">{window.gamesPlayed} GP</div>
      <div className="text-xs text-muted-foreground">
        {window.gamesPerWeek.toFixed(1)} games/week
      </div>
      <div className="mt-2 text-xs">
        <span className="text-muted-foreground">Avg SA: </span>
        <span
          className={
            window.avgShotsAgainstPerGame > 30 ? "text-orange-500" : ""
          }
        >
          {window.avgShotsAgainstPerGame.toFixed(1)}
        </span>
      </div>
      <div className="text-xs">
        <span className="text-muted-foreground">SV%: </span>
        <span>{formatSavePct(window.avgSavePercentage)}</span>
      </div>
    </div>
  );
}

function BackToBackSplitsDisplay({ splits }: { splits: BackToBackSplits }) {
  const svPctDiff =
    (splits.nonBackToBackSavePercentage - splits.backToBackSavePercentage) *
    100;

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="rounded-lg border p-3">
        <div className="text-xs text-muted-foreground mb-1">
          Back-to-Back ({splits.backToBackGames} games)
        </div>
        <div className="text-lg font-semibold">
          {formatSavePct(splits.backToBackSavePercentage)} SV%
        </div>
        <div className="text-xs text-muted-foreground">
          {splits.backToBackGAA.toFixed(2)} GAA
        </div>
        <div className="text-xs">GSAx: {splits.backToBackGSAx.toFixed(2)}</div>
      </div>
      <div className="rounded-lg border p-3">
        <div className="text-xs text-muted-foreground mb-1">
          With Rest ({splits.nonBackToBackGames} games)
        </div>
        <div className="text-lg font-semibold">
          {formatSavePct(splits.nonBackToBackSavePercentage)} SV%
        </div>
        <div className="text-xs text-muted-foreground">
          {splits.nonBackToBackGAA.toFixed(2)} GAA
        </div>
        <div className="text-xs">
          GSAx: {splits.nonBackToBackGSAx.toFixed(2)}
        </div>
      </div>
      {splits.backToBackGames > 0 && splits.nonBackToBackGames > 0 && (
        <div className="col-span-2 text-xs text-center text-muted-foreground">
          {svPctDiff > 0 ? (
            <span>
              SV% drops by{" "}
              <span className="text-orange-500 font-medium">
                {svPctDiff.toFixed(1)}%
              </span>{" "}
              in back-to-backs
            </span>
          ) : (
            <span className="text-green-500">
              No significant B2B performance drop
            </span>
          )}
        </div>
      )}
    </div>
  );
}
