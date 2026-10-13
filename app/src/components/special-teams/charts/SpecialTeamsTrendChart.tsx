import { useMemo } from "react";
import { Swatch } from "@/components/game-live/parts";
import { formatGameDate } from "@/lib/game-formatters";
import { ChartLegend } from "@/components/charts/ChartLegend";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CHART_AXIS_COLOURS, SEMANTIC_COLOURS } from "@/lib/chart-colours";
import { Skeleton } from "@/components/ui/skeleton";
import type { SpecialTeamsGame } from "@/types";
import { EmptyState } from "@/components/layout";

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
    <div className="rounded-xl border bg-popover text-popover-foreground shadow-lg shadow-black/5 p-3 text-sm">
      <div className="font-semibold mb-2">
        Game {label}: vs {data.opponent}
      </div>
      <div className="text-xs text-muted-foreground mb-2">
        {formatGameDate(data.gameDate)}
      </div>
      <div className="space-y-2 text-xs">
        <div>
          <div className="mb-1 flex items-center gap-1.5 font-medium"><Swatch colour={SEMANTIC_COLOURS.primary} />Power play</div>
          <p>
            <span className="text-muted-foreground">Cumulative:</span>{" "}
            <span className="tabular-nums">{data.cumulativePpGoals} G / {data.cumulativePpXGoals.toFixed(1)} xG</span>
          </p>
          <p>
            <span className="text-muted-foreground">Diff:</span>{" "}
            <span className={`tabular-nums font-semibold ${ppDiff >= 0 ? "text-success" : "text-error"}`}>
              {ppDiffSign}{ppDiff.toFixed(1)}
            </span>
          </p>
        </div>
        <div>
          <div className="mb-1 flex items-center gap-1.5 font-medium"><Swatch colour="var(--chart-5)" />Penalty kill</div>
          <p>
            <span className="text-muted-foreground">Cumulative:</span>{" "}
            <span className="tabular-nums">{data.cumulativePkGoalsAgainst} GA / {data.cumulativePkXGoalsAgainst.toFixed(1)} xGA</span>
          </p>
          <p>
            <span className="text-muted-foreground">Diff:</span>{" "}
            <span className={`tabular-nums font-semibold ${pkDiff <= 0 ? "text-success" : "text-error"}`}>
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
          Special teams performance through season
        </h3>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <EmptyState
        className="border-0 py-8"
        title="No game-by-game special teams data yet"
      />
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
        Cumulative goals vs expected through season
      </h3>
      <ChartLegend
        className="mb-2"
        items={[
          { label: "PP goals", colour: SEMANTIC_COLOURS.primary },
          { label: "PP xG", colour: SEMANTIC_COLOURS.primary, dashed: true },
          { label: "PK goals against", colour: "var(--chart-5)" },
          { label: "PK xGA", colour: "var(--chart-5)", dashed: true },
        ]}
      />
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
          <Line
            type="monotone"
            dataKey="cumulativePpGoals"
            name="PP goals"
            stroke={SEMANTIC_COLOURS.primary}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="cumulativePpXGoals"
            name="PP xG"
            stroke={SEMANTIC_COLOURS.primary}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="cumulativePkGoalsAgainst"
            name="PK goals against"
            stroke="var(--chart-5)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="cumulativePkXGoalsAgainst"
            name="PK xGA"
            stroke="var(--chart-5)"
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
