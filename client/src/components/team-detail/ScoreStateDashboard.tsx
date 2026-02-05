import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useScoreStateStats } from "@/hooks";
import type { ScoreStateBreakdown } from "@/types";

interface ScoreStateDashboardProps {
  abbrev: string;
  season?: number;
}

export function ScoreStateDashboard({ abbrev, season }: ScoreStateDashboardProps) {
  const currentSeason = season ?? new Date().getFullYear();
  const { data, isLoading, error } = useScoreStateStats(abbrev, currentSeason, false);

  if (isLoading) {
    return <ScoreStateDashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Unable to load score state statistics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Score State Performance</h2>
          <p className="text-sm text-muted-foreground">
            How the team performs when leading, trailing, or tied
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger>
            <Info className="h-5 w-5 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>
              Score state analysis shows team performance based on the score at the
              time of each shot. This helps identify whether a team plays differently
              when protecting a lead vs. chasing a game.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ScoreStateCard state="leading" breakdown={data.leading} total={data.total} />
        <ScoreStateCard state="trailing" breakdown={data.trailing} total={data.total} />
        <ScoreStateCard state="tied" breakdown={data.tied} total={data.total} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Detailed Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <ScoreStateTable data={data} />
        </CardContent>
      </Card>
    </div>
  );
}

interface ScoreStateCardProps {
  state: "leading" | "trailing" | "tied";
  breakdown: ScoreStateBreakdown;
  total: ScoreStateBreakdown;
}

// Format seconds as HH:MM:SS or MM:SS
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function ScoreStateCard({ state, breakdown, total }: ScoreStateCardProps) {
  const config = {
    leading: {
      label: "When Leading",
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    trailing: {
      label: "When Trailing",
      icon: TrendingDown,
      color: "text-error",
      bgColor: "bg-error/10",
    },
    tied: {
      label: "When Tied",
      icon: Minus,
      color: "text-cold",
      bgColor: "bg-cold/10",
    },
  }[state];

  const Icon = config.icon;

  // Check if this state has any meaningful data
  const hasData = breakdown.shotsFor > 0 || breakdown.shotsAgainst > 0 ||
    breakdown.goalsFor > 0 || breakdown.goalsAgainst > 0;

  // Calculate percentages of total
  const shotShareFor = total.shotsFor > 0
    ? (breakdown.shotsFor / total.shotsFor * 100).toFixed(1)
    : "0.0";
  const goalShareFor = total.goalsFor > 0
    ? (breakdown.goalsFor / total.goalsFor * 100).toFixed(1)
    : "0.0";
  const timeSharePct = total.timeSeconds && breakdown.timeSeconds
    ? (breakdown.timeSeconds / total.timeSeconds * 100).toFixed(1)
    : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className={`p-1.5 rounded ${config.bgColor}`}>
            <Icon className={`h-4 w-4 ${config.color}`} />
          </div>
          {config.label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasData ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            No time spent in this state
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold tabular-nums">
                  {breakdown.goalsFor}
                </div>
                <div className="text-xs text-muted-foreground">Goals For</div>
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums">
                  {breakdown.goalsAgainst}
                </div>
                <div className="text-xs text-muted-foreground">Goals Against</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">xG Differential</span>
                <span className={`font-medium tabular-nums ${
                  breakdown.xgDifferential > 0 ? "text-success" :
                  breakdown.xgDifferential < 0 ? "text-error" : ""
                }`}>
                  {breakdown.xgDifferential > 0 ? "+" : ""}{breakdown.xgDifferential.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shooting %</span>
                <span className="font-medium tabular-nums">
                  {breakdown.shootingPct != null ? `${breakdown.shootingPct.toFixed(1)}%` : "N/A"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Save %</span>
                <span className="font-medium tabular-nums">
                  {breakdown.savePct != null ? `${breakdown.savePct.toFixed(1)}%` : "N/A"}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
              {breakdown.timeSeconds != null && (
                <div className="flex justify-between">
                  <span>Time in state</span>
                  <span className="font-medium tabular-nums">
                    {formatTime(breakdown.timeSeconds)}
                    {timeSharePct && ` (${timeSharePct}%)`}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>{shotShareFor}% of shots</span>
                <span>{goalShareFor}% of goals</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface ScoreStateTableProps {
  data: {
    leading: ScoreStateBreakdown;
    trailing: ScoreStateBreakdown;
    tied: ScoreStateBreakdown;
    total: ScoreStateBreakdown;
  };
}

function ScoreStateTable({ data }: ScoreStateTableProps) {
  const rows = useMemo(() => [
    { label: "Leading", ...data.leading, isTotal: false },
    { label: "Trailing", ...data.trailing, isTotal: false },
    { label: "Tied", ...data.tied, isTotal: false },
    { label: "Total", ...data.total, isTotal: true },
  ], [data]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 pr-4 font-medium">State</th>
            <th className="text-right py-2 px-2 font-medium">Time</th>
            <th className="text-right py-2 px-2 font-medium">SF</th>
            <th className="text-right py-2 px-2 font-medium">SA</th>
            <th className="text-right py-2 px-2 font-medium">GF</th>
            <th className="text-right py-2 px-2 font-medium">GA</th>
            <th className="text-right py-2 px-2 font-medium">xGF</th>
            <th className="text-right py-2 px-2 font-medium">xGA</th>
            <th className="text-right py-2 px-2 font-medium">xG+/-</th>
            <th className="text-right py-2 px-2 font-medium">SH%</th>
            <th className="text-right py-2 pl-2 font-medium">SV%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.label}
              className={`border-b last:border-0 ${
                row.isTotal ? "font-semibold bg-muted/30" : ""
              }`}
            >
              <td className="py-2 pr-4">{row.label}</td>
              <td className="text-right py-2 px-2 tabular-nums">
                {row.timeSeconds != null ? formatTime(row.timeSeconds) : "-"}
              </td>
              <td className="text-right py-2 px-2 tabular-nums">{row.shotsFor}</td>
              <td className="text-right py-2 px-2 tabular-nums">{row.shotsAgainst}</td>
              <td className="text-right py-2 px-2 tabular-nums">{row.goalsFor}</td>
              <td className="text-right py-2 px-2 tabular-nums">{row.goalsAgainst}</td>
              <td className="text-right py-2 px-2 tabular-nums">{row.xGoalsFor.toFixed(1)}</td>
              <td className="text-right py-2 px-2 tabular-nums">{row.xGoalsAgainst.toFixed(1)}</td>
              <td className={`text-right py-2 px-2 tabular-nums ${
                row.xgDifferential > 0 ? "text-success" :
                row.xgDifferential < 0 ? "text-error" : ""
              }`}>
                {row.xgDifferential > 0 ? "+" : ""}{row.xgDifferential.toFixed(2)}
              </td>
              <td className="text-right py-2 px-2 tabular-nums">
                {row.shootingPct?.toFixed(1) ?? "-"}%
              </td>
              <td className="text-right py-2 pl-2 tabular-nums">
                {row.savePct?.toFixed(1) ?? "-"}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScoreStateDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-7 w-64 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
