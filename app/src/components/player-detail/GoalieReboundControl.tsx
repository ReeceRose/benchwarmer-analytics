import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { GoalieStats } from "@/types";

interface GoalieReboundControlProps {
  stats: GoalieStats[];
  leagueAverageRatio?: number | null;
  className?: string;
}

/**
 * League average rebound ratio (actual rebounds / expected rebounds).
 * Goalies typically allow ~60% more rebounds than expected.
 * Calculated from MoneyPuck data: avg expected 16.4, avg actual 25.9 = 1.58x
 * Values below this indicate above-average rebound control.
 */
const DEFAULT_LEAGUE_AVERAGE_REBOUND_RATIO = 1.58;

interface ReboundData {
  expected: number;
  actual: number;
  difference: number;
  ratio: number;
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

  return {
    expected: Math.round(totals.expected * 10) / 10,
    actual: totals.actual,
    difference: totals.actual - totals.expected,
    ratio,
  };
}

function getReboundRating(
  vsLeague: number,
): { label: string; color: string; description: string } {
  if (vsLeague >= 15) {
    return {
      label: "Elite",
      color: "text-success",
      description: "Controls rebounds significantly better than average",
    };
  }
  if (vsLeague >= 5) {
    return {
      label: "Above average",
      color: "text-success",
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
      label: "Below average",
      color: "text-warning",
      description: "Allows more rebounds than most goalies",
    };
  }
  return {
    label: "Poor",
    color: "text-error",
    description: "Struggles with rebound control",
  };
}

export function GoalieReboundControl({
  stats,
  leagueAverageRatio,
  className,
}: GoalieReboundControlProps) {
  const reboundData = useMemo(() => calculateReboundStats(stats), [stats]);

  if (!reboundData) {
    return null;
  }

  const leagueAvgRatio =
    leagueAverageRatio != null ? leagueAverageRatio : DEFAULT_LEAGUE_AVERAGE_REBOUND_RATIO;
  const vsLeague =
    ((leagueAvgRatio - reboundData.ratio) / leagueAvgRatio) * 100;

  const rating = getReboundRating(vsLeague);

  const max = Math.max(reboundData.expected, reboundData.actual, 1);
  const bars = [
    { label: "Expected", value: reboundData.expected, text: reboundData.expected.toFixed(1), colour: "var(--muted-foreground)" },
    { label: "Allowed", value: reboundData.actual, text: String(reboundData.actual), colour: "var(--chart-1)" },
  ];
  const better = vsLeague >= 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>Rebound control</span>
          <span className={cn("text-sm font-medium", rating.color)}>{rating.label}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-display text-3xl font-bold tabular-nums">
              {reboundData.ratio.toFixed(2)}×
            </p>
            <p className="text-xs text-muted-foreground">Rebounds per expected rebound</p>
          </div>
          <div>
            <p className={cn("font-display text-3xl font-bold tabular-nums", better ? "text-success" : "text-error")}>
              {Math.abs(vsLeague).toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">
              {better ? "Fewer" : "More"} rebounds than league average ({leagueAvgRatio.toFixed(2)}×)
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {bars.map((bar) => (
            <div key={bar.label} className="grid grid-cols-[4.5rem_1fr_3rem] items-center gap-3 text-sm">
              <span className="text-muted-foreground">{bar.label}</span>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(100 * bar.value) / max}%`, background: bar.colour }}
                />
              </div>
              <span className="text-right font-medium tabular-nums">{bar.text}</span>
            </div>
          ))}
        </div>

        <p className="border-t pt-3 text-xs text-muted-foreground">
          {rating.description}. Expected rebounds come from MoneyPuck's shot model; lower ratios
          are better.
        </p>
      </CardContent>
    </Card>
  );
}
