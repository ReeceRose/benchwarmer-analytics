import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import type { SkaterStats } from "@/types";

// Takeaway/giveaway ratio thresholds for rating tiers
// Based on NHL averages: league-wide TA/GA ratio hovers around 0.3-0.4
const RATIO_EXCEPTIONAL = 1.0; // More takeaways than giveaways - extremely rare
const RATIO_ELITE = 0.5; // Top ~10% of skaters
const RATIO_GOOD = 0.35; // Above league average
const RATIO_AVERAGE = 0.25; // Around league average
const RATIO_BELOW_AVERAGE = 0.15; // Bottom quartile

// Minimum percentage width to show label inside bar segment
const BAR_LABEL_MIN_PCT = 15;

interface GiveawayTakeawayCardProps {
  stats: SkaterStats;
  className?: string;
}

export function GiveawayTakeawayCard({
  stats,
  className,
}: GiveawayTakeawayCardProps) {
  const { takeaways, giveaways, dZoneGiveaways, giveawayDZonePct } = stats;

  const hasData =
    takeaways != null &&
    giveaways != null &&
    giveaways > 0;

  const nzOzGiveaways = hasData && dZoneGiveaways != null
    ? giveaways! - dZoneGiveaways
    : null;

  const takeawayGiveawayRatio = hasData
    ? Math.round((takeaways! / giveaways!) * 100) / 100
    : null;

  const rating = useMemo(() => {
    if (takeawayGiveawayRatio == null) return null;
    if (takeawayGiveawayRatio >= RATIO_EXCEPTIONAL) return { label: "Exceptional", color: "text-success" };
    if (takeawayGiveawayRatio > RATIO_ELITE) return { label: "Elite", color: "text-success" };
    if (takeawayGiveawayRatio >= RATIO_GOOD) return { label: "Good", color: "text-success" };
    if (takeawayGiveawayRatio >= RATIO_AVERAGE) return { label: "Average", color: "text-muted-foreground" };
    if (takeawayGiveawayRatio >= RATIO_BELOW_AVERAGE) return { label: "Below Average", color: "text-warning" };
    return { label: "Poor", color: "text-error" };
  }, [takeawayGiveawayRatio]);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          Puck Management
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>
                Takeaway/giveaway ratio measures puck security. D-zone giveaways are
                more dangerous as they can lead to scoring chances against.
              </p>
            </TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasData && rating ? (
          <>
            <div>
              <div className="text-xs text-muted-foreground mb-1">
                Takeaway/Giveaway Ratio
              </div>
              <div className="flex items-center gap-3">
                <div className="text-3xl font-bold tabular-nums">
                  {takeawayGiveawayRatio!.toFixed(2)}
                </div>
                <div className={`text-sm font-medium ${rating.color}`}>
                  {rating.label}
                </div>
              </div>
            </div>

            {dZoneGiveaways != null && giveawayDZonePct != null && nzOzGiveaways != null && (
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Giveaway Zones</span>
                  <span>{giveaways!.toFixed(0)} total</span>
                </div>
                <div className="h-6 rounded-md overflow-hidden flex">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="bg-destructive/70 flex items-center justify-center text-[10px] font-semibold text-white cursor-help transition-opacity hover:opacity-90"
                        style={{ width: `${giveawayDZonePct}%` }}
                      >
                        {giveawayDZonePct > BAR_LABEL_MIN_PCT && `${dZoneGiveaways.toFixed(0)}`}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-semibold">D-Zone</p>
                      <p className="text-sm">{dZoneGiveaways.toFixed(0)} giveaways ({giveawayDZonePct.toFixed(1)}%)</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="bg-muted/50 flex items-center justify-center text-[10px] font-semibold text-foreground cursor-help transition-opacity hover:opacity-90"
                        style={{ width: `${100 - giveawayDZonePct}%` }}
                      >
                        {(100 - giveawayDZonePct) > BAR_LABEL_MIN_PCT && `${nzOzGiveaways.toFixed(0)}`}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-semibold">O/N-Zone</p>
                      <p className="text-sm">{nzOzGiveaways.toFixed(0)} giveaways ({(100 - giveawayDZonePct).toFixed(1)}%)</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {giveawayDZonePct.toFixed(1)}% of giveaways in defensive zone
                </div>
              </div>
            )}

            <div className="flex justify-between text-sm pt-1">
              <div>
                <span className="text-muted-foreground">Takeaways:</span>{" "}
                <span className="font-semibold tabular-nums">{takeaways!.toFixed(0)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Giveaways:</span>{" "}
                <span className="font-semibold tabular-nums">{giveaways!.toFixed(0)}</span>
              </div>
            </div>

            {dZoneGiveaways != null && (
              <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-destructive/70" />
                  <span>D-Zone</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-muted/50" />
                  <span>O/N-Zone</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
            No data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
