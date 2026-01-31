import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_COLOURS } from "@/lib/chart-colours";
import type { GoalieStats } from "@/types";

interface GoalieReboundControlProps {
  stats: GoalieStats[];
  className?: string;
}

/**
 * League average rebound ratio (actual rebounds / expected rebounds).
 * Goalies typically allow ~60% more rebounds than expected.
 * Calculated from MoneyPuck data: avg expected 16.4, avg actual 25.9 = 1.58x
 * Values below this indicate above-average rebound control.
 */
const LEAGUE_AVERAGE_REBOUND_RATIO = 1.58;

interface ReboundData {
  expected: number;
  actual: number;
  difference: number;
  ratio: number;
  vsLeague: number;
}

function calculateReboundStats(stats: GoalieStats[]): ReboundData | null {
  const totals = stats.reduce(
    (acc, s) => ({
      expected: acc.expected + (s.expectedRebounds ?? 0),
      actual: acc.actual + s.rebounds,
    }),
    { expected: 0, actual: 0 },
  );

  if (totals.expected === 0) return null;

  const ratio = totals.actual / totals.expected;
  const vsLeague = ((LEAGUE_AVERAGE_REBOUND_RATIO - ratio) / LEAGUE_AVERAGE_REBOUND_RATIO) * 100;

  return {
    expected: Math.round(totals.expected * 10) / 10,
    actual: totals.actual,
    difference: totals.actual - totals.expected,
    ratio,
    vsLeague,
  };
}

function getReboundRating(
  vsLeague: number,
): { label: string; color: string; description: string } {
  if (vsLeague >= 15) {
    return {
      label: "Elite",
      color: "text-green-500",
      description: "Controls rebounds significantly better than average",
    };
  }
  if (vsLeague >= 5) {
    return {
      label: "Above Average",
      color: "text-green-400",
      description: "Controls rebounds better than most goalies",
    };
  }
  if (vsLeague >= -5) {
    return {
      label: "Average",
      color: "text-muted-foreground",
      description: "Typical rebound control for the league",
    };
  }
  if (vsLeague >= -15) {
    return {
      label: "Below Average",
      color: "text-orange-400",
      description: "Allows more rebounds than most goalies",
    };
  }
  return {
    label: "Poor",
    color: "text-red-500",
    description: "Struggles with rebound control",
  };
}

export function GoalieReboundControl({
  stats,
  className,
}: GoalieReboundControlProps) {
  const reboundData = useMemo(() => calculateReboundStats(stats), [stats]);

  if (!reboundData) {
    return null;
  }

  const rating = getReboundRating(reboundData.vsLeague);

  const chartData = [
    { name: "Expected", value: reboundData.expected, fill: "#94a3b8" },
    { name: "Actual", value: reboundData.actual, fill: CHART_COLOURS[0] },
  ];

  const diffSign = reboundData.difference >= 0 ? "+" : "";
  const vsLeagueSign = reboundData.vsLeague >= 0 ? "+" : "";

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Rebound Control</span>
          <span className={`text-sm font-medium ${rating.color}`}>
            {rating.label}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold tabular-nums">
              {reboundData.ratio.toFixed(2)}x
            </p>
            <p className="text-xs text-muted-foreground">Rebound Ratio</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p
              className={`text-2xl font-bold tabular-nums ${
                reboundData.vsLeague >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {vsLeagueSign}
              {reboundData.vsLeague.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">vs League Avg</p>
          </div>
        </div>

        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 0, right: 50, top: 5, bottom: 5 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11 }}
                width={55}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
                <LabelList
                  dataKey="value"
                  position="right"
                  formatter={(value) => (value as number).toFixed(0)}
                  className="fill-foreground text-xs font-mono"
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {rating.description}
        </p>

        <div className="text-xs border-t pt-3 space-y-1">
          <div className="flex justify-between text-muted-foreground">
            <span>Expected Rebounds:</span>
            <span className="font-mono">{reboundData.expected.toFixed(1)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Actual Rebounds:</span>
            <span className="font-mono">{reboundData.actual}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Difference:</span>
            <span className="font-mono">
              {diffSign}
              {reboundData.difference.toFixed(1)}
            </span>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground/70 text-center">
          League avg: {LEAGUE_AVERAGE_REBOUND_RATIO.toFixed(2)}x (lower is better)
        </p>
      </CardContent>
    </Card>
  );
}
