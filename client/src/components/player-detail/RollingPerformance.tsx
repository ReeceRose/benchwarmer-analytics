import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
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
import { Flame, Snowflake, Minus } from "lucide-react";
import { usePlayerRollingStats } from "@/hooks";
import { CHART_AXIS_COLOURS, CHART_GRADIENT_COLOURS } from "@/lib/chart-colours";
import { formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { GameStats } from "@/types";

interface RollingPerformanceProps {
  playerId: number;
  season: number;
  className?: string;
}

type MetricKey = "goals" | "shots" | "expectedGoals" | "shootingPct";

const METRICS: {
  key: MetricKey;
  label: string;
  format: (v: number) => string;
}[] = [
  { key: "goals", label: "Goals", format: (v) => v.toFixed(0) },
  { key: "shots", label: "Shots", format: (v) => v.toFixed(0) },
  { key: "expectedGoals", label: "xG", format: (v) => v.toFixed(2) },
  {
    key: "shootingPct",
    label: "Sh%",
    format: (v) => formatPercent(v, false),
  },
];

const GAME_WINDOWS = [
  { value: "10", label: "Last 10 Games" },
  { value: "15", label: "Last 15 Games" },
  { value: "20", label: "Last 20 Games" },
];

export function RollingPerformance({
  playerId,
  season,
  className,
}: RollingPerformanceProps) {
  const [metric, setMetric] = useState<MetricKey>("goals");
  const [games, setGames] = useState("10");

  const { data, isLoading } = usePlayerRollingStats(
    playerId,
    season,
    parseInt(games)
  );

  const chartData = useMemo(() => {
    if (!data?.games) return [];

    return data.games.map((game: GameStats, index: number) => ({
      game: index + 1,
      gameId: game.gameId,
      goals: game.goals,
      shots: game.shots,
      expectedGoals: game.expectedGoals,
      shootingPct: game.shootingPct,
    }));
  }, [data]);

  const seasonAverage = useMemo(() => {
    if (!data) return 0;
    switch (metric) {
      case "goals":
        return data.seasonGoalsPerGame;
      case "shots":
        return data.seasonShotsPerGame;
      case "expectedGoals":
        return data.seasonXgPerGame;
      case "shootingPct":
        return data.seasonShootingPct;
    }
  }, [data, metric]);

  const selectedMetric = METRICS.find((m) => m.key === metric)!;

  if (isLoading) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Rolling Performance
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

  if (!data || !data.games || data.games.length < 3) {
    return null;
  }

  const TrendIcon =
    data.trend === "hot" ? Flame : data.trend === "cold" ? Snowflake : Minus;
  const trendColor =
    data.trend === "hot"
      ? "text-hot"
      : data.trend === "cold"
        ? "text-cold"
        : "text-muted-foreground";
  const trendBg =
    data.trend === "hot"
      ? "bg-hot/10 text-hot border-hot/20"
      : data.trend === "cold"
        ? "bg-cold/10 text-cold border-cold/20"
        : "bg-muted text-muted-foreground";

  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <CardTitle className="text-base font-semibold">
            Rolling Performance
          </CardTitle>
          <Badge variant="outline" className={trendBg}>
            <TrendIcon className={`h-3 w-3 mr-1 ${trendColor}`} />
            {data.trend === "hot"
              ? "Hot"
              : data.trend === "cold"
                ? "Cold"
                : "Neutral"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Select value={games} onValueChange={setGames}>
            <SelectTrigger className="w-40 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GAME_WINDOWS.map((w) => (
                <SelectItem key={w.value} value={w.value}>
                  {w.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={metric}
            onValueChange={(v) => setMetric(v as MetricKey)}
          >
            <SelectTrigger className="w-24 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METRICS.map((m) => (
                <SelectItem key={m.key} value={m.key}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="rollingGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={CHART_GRADIENT_COLOURS.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_GRADIENT_COLOURS.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={CHART_AXIS_COLOURS.grid}
                strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
              />
              <XAxis
                dataKey="game"
                tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
                tickFormatter={(v) => `G${v}`}
                stroke={CHART_AXIS_COLOURS.grid}
                strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
              />
              <YAxis
                tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 11 }}
                width={35}
                tickFormatter={(v) => selectedMetric.format(v)}
                stroke={CHART_AXIS_COLOURS.grid}
                strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
                      <p className="font-semibold">Game {d.game}</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 text-xs">
                        <span className="text-muted-foreground">Goals:</span>
                        <span>{d.goals}</span>
                        <span className="text-muted-foreground">Shots:</span>
                        <span>{d.shots}</span>
                        <span className="text-muted-foreground">xG:</span>
                        <span>{d.expectedGoals.toFixed(2)}</span>
                        <span className="text-muted-foreground">Sh%:</span>
                        <span>{formatPercent(d.shootingPct, false)}</span>
                      </div>
                    </div>
                  );
                }}
              />
              <ReferenceLine
                y={seasonAverage}
                stroke={CHART_AXIS_COLOURS.reference}
                strokeDasharray="5 5"
                label={{
                  value: "Season Avg",
                  position: "right",
                  fontSize: 10,
                  fill: CHART_AXIS_COLOURS.reference,
                }}
              />
              <Area
                type="monotone"
                dataKey={metric}
                stroke={CHART_GRADIENT_COLOURS.primary}
                strokeWidth={2}
                fill="url(#rollingGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>
            Rolling avg:{" "}
            {selectedMetric.format(
              metric === "goals"
                ? data.rollingGoalsPerGame
                : metric === "shots"
                  ? data.rollingShotsPerGame
                  : metric === "expectedGoals"
                    ? data.rollingXgPerGame
                    : data.rollingShootingPct
            )}
            /game
          </span>
          <span>Season avg: {selectedMetric.format(seasonAverage)}/game</span>
        </div>
      </CardContent>
    </Card>
  );
}
