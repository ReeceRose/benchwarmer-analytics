import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import type { SkaterStats, SkaterLeagueBaselinesResponse } from "@/types";

interface FaceoffStatsCardProps {
  stats: SkaterStats;
  baselines?: SkaterLeagueBaselinesResponse;
  className?: string;
}

// Fallback league average if baselines not loaded (mathematically must be 50%)
const FALLBACK_LEAGUE_FO_PCT = 50;

export function FaceoffStatsCard({
  stats,
  baselines,
  className,
}: FaceoffStatsCardProps) {
  const { faceoffsWon, faceoffsLost, faceoffPct } = stats;

  const totalFaceoffs = (faceoffsWon ?? 0) + (faceoffsLost ?? 0);
  const hasData = faceoffsWon != null && faceoffsLost != null && faceoffPct != null && totalFaceoffs >= 10;

  // Use calculated league average if available, otherwise fallback to 50%
  const leagueAvgFoPct = baselines?.faceoffPct ?? FALLBACK_LEAGUE_FO_PCT;

  // Memoize rating calculation to avoid recalculating on every render
  const rating = useMemo(() => {
    if (faceoffPct == null) return null;
    if (faceoffPct >= 55) return { label: "Elite", color: "text-emerald-500" };
    if (faceoffPct >= 52) return { label: "Above Average", color: "text-green-500" };
    if (faceoffPct >= 48) return { label: "Average", color: "text-muted-foreground" };
    if (faceoffPct >= 45) return { label: "Below Average", color: "text-orange-500" };
    return { label: "Poor", color: "text-red-500" };
  }, [faceoffPct]);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          Faceoff Stats
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>
                Faceoff win percentage measures a player&apos;s ability to win draws.
                League average is {leagueAvgFoPct.toFixed(1)}%. Elite faceoff specialists are above 55%.
              </p>
            </TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasData && rating ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold tabular-nums">
                  {faceoffPct!.toFixed(1)}%
                </div>
                <div className={`text-sm font-medium ${rating.color}`}>
                  {rating.label}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-semibold tabular-nums ${faceoffPct! - leagueAvgFoPct >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {faceoffPct! - leagueAvgFoPct >= 0 ? "+" : ""}{(faceoffPct! - leagueAvgFoPct).toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">vs league avg ({leagueAvgFoPct.toFixed(1)}%)</div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Faceoffs</span>
                <span>{totalFaceoffs.toFixed(0)} total</span>
              </div>
              <div className="h-6 rounded-md overflow-hidden flex">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="bg-success/80 flex items-center justify-center text-[10px] font-semibold text-white cursor-help transition-opacity hover:opacity-90"
                      style={{ width: `${faceoffPct}%` }}
                    >
                      {faceoffPct! > 15 && `${faceoffsWon!.toFixed(0)} W`}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-semibold">Won</p>
                    <p className="text-sm">{faceoffsWon!.toFixed(0)} faceoffs ({faceoffPct!.toFixed(1)}%)</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="bg-destructive/70 flex items-center justify-center text-[10px] font-semibold text-white cursor-help transition-opacity hover:opacity-90"
                      style={{ width: `${100 - faceoffPct!}%` }}
                    >
                      {(100 - faceoffPct!) > 15 && `${faceoffsLost!.toFixed(0)} L`}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-semibold">Lost</p>
                    <p className="text-sm">{faceoffsLost!.toFixed(0)} faceoffs ({(100 - faceoffPct!).toFixed(1)}%)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-success/80" />
                <span>Won</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-destructive/70" />
                <span>Lost</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
            No faceoff data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
