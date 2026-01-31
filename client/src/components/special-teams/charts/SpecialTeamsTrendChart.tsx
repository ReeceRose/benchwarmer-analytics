import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { CHART_AXIS_COLOURS, SEMANTIC_COLOURS } from "@/lib/chart-colours";
import { Skeleton } from "@/components/ui/skeleton";
import type { SpecialTeamsGame } from "@/types";

interface SpecialTeamsTrendChartProps {
  games: SpecialTeamsGame[];
  isLoading?: boolean;
}

interface ChartDataPoint {
  gameNum: number;
  gameDate: string;
  opponent: string;
  ppGoals: number;
  ppXGoals: number;
  pkGoalsAgainst: number;
  pkXGoalsAgainst: number;
  cumulativePpGoals: number;
  cumulativePpXGoals: number;
  cumulativePkGoalsAgainst: number;
  cumulativePkXGoalsAgainst: number;
  ppDiff: number;
  pkDiff: number;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint; dataKey: string; value: number; color: string }>;
  label?: number;
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const ppDiff = data.cumulativePpGoals - data.cumulativePpXGoals;
  const pkDiff = data.cumulativePkGoalsAgainst - data.cumulativePkXGoalsAgainst;
  const ppDiffSign = ppDiff > 0 ? "+" : "";
  const pkDiffSign = pkDiff > 0 ? "+" : "";

  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
      <div className="font-semibold mb-2">
        Game {label}: vs {data.opponent}
      </div>
      <div className="text-xs text-muted-foreground mb-2">
        {new Date(data.gameDate).toLocaleDateString()}
      </div>
      <div className="space-y-2 text-xs">
        <div>
          <div className="font-medium text-success mb-1">Power Play</div>
          <p>
            <span className="text-muted-foreground">Cumulative:</span>{" "}
            <span className="font-mono">{data.cumulativePpGoals} G / {data.cumulativePpXGoals.toFixed(1)} xG</span>
          </p>
          <p>
            <span className="text-muted-foreground">Diff:</span>{" "}
            <span className={`font-mono font-semibold ${ppDiff >= 0 ? "text-success" : "text-destructive"}`}>
              {ppDiffSign}{ppDiff.toFixed(1)}
            </span>
          </p>
        </div>
        <div>
          <div className="font-medium text-destructive mb-1">Penalty Kill</div>
          <p>
            <span className="text-muted-foreground">Cumulative:</span>{" "}
            <span className="font-mono">{data.cumulativePkGoalsAgainst} GA / {data.cumulativePkXGoalsAgainst.toFixed(1)} xGA</span>
          </p>
          <p>
            <span className="text-muted-foreground">Diff:</span>{" "}
            <span className={`font-mono font-semibold ${pkDiff <= 0 ? "text-success" : "text-destructive"}`}>
              {pkDiffSign}{pkDiff.toFixed(1)}
            </span>
            <span className="text-muted-foreground ml-1">(lower is better)</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export function SpecialTeamsTrendChart({ games, isLoading }: SpecialTeamsTrendChartProps) {
  const chartData = useMemo(() => {
    if (!games || games.length === 0) return [];

    return games.map((game, index): ChartDataPoint => ({
      gameNum: index + 1,
      gameDate: game.gameDate,
      opponent: game.opponent,
      ppGoals: game.ppGoals,
      ppXGoals: game.ppXGoals,
      pkGoalsAgainst: game.pkGoalsAgainst,
      pkXGoalsAgainst: game.pkXGoalsAgainst,
      cumulativePpGoals: game.cumulativePpGoals,
      cumulativePpXGoals: game.cumulativePpXGoals,
      cumulativePkGoalsAgainst: game.cumulativePkGoalsAgainst,
      cumulativePkXGoalsAgainst: game.cumulativePkXGoalsAgainst,
      ppDiff: game.cumulativePpGoals - game.cumulativePpXGoals,
      pkDiff: game.cumulativePkGoalsAgainst - game.cumulativePkXGoalsAgainst,
    }));
  }, [games]);

  if (isLoading) {
    return (
      <div>
        <h3 className="text-sm font-semibold mb-3">
          Special Teams Performance Through Season
        </h3>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No game-by-game special teams data available.
      </div>
    );
  }

  // Calculate max for Y axis
  const maxValue = Math.max(
    ...chartData.map(d => Math.max(
      d.cumulativePpGoals,
      d.cumulativePpXGoals,
      d.cumulativePkGoalsAgainst,
      d.cumulativePkXGoalsAgainst
    ))
  );

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3">
        Cumulative Goals vs Expected Through Season
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 20, bottom: 25, left: 10 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={CHART_AXIS_COLOURS.grid}
            strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
          />
          <XAxis
            dataKey="gameNum"
            tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 10 }}
            stroke={CHART_AXIS_COLOURS.grid}
            strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            label={{
              value: "Game #",
              position: "bottom",
              offset: 0,
              fill: CHART_AXIS_COLOURS.tick,
              fontSize: 10,
            }}
          />
          <YAxis
            domain={[0, Math.ceil(maxValue * 1.1)]}
            tick={{ fill: CHART_AXIS_COLOURS.tick, fontSize: 10 }}
            stroke={CHART_AXIS_COLOURS.grid}
            strokeOpacity={CHART_AXIS_COLOURS.gridOpacity}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 15 }}
            iconType="line"
          />
          <Line
            type="monotone"
            dataKey="cumulativePpGoals"
            name="PP Goals"
            stroke={SEMANTIC_COLOURS.success}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="cumulativePpXGoals"
            name="PP xG"
            stroke={SEMANTIC_COLOURS.success}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="cumulativePkGoalsAgainst"
            name="PK Goals Against"
            stroke={SEMANTIC_COLOURS.danger}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="cumulativePkXGoalsAgainst"
            name="PK xGA"
            stroke={SEMANTIC_COLOURS.danger}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-muted-foreground text-center mt-2">
        Solid lines = actual goals, dashed lines = expected. PP above xG and PK below xGA is good.
      </p>
    </div>
  );
}
