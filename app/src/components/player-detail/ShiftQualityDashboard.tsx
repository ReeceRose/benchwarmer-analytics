import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import type { SkaterStats } from "@/types";

interface ShiftQualityDashboardProps {
  stats: SkaterStats;
  className?: string;
}

export function ShiftQualityDashboard({
  stats,
  className,
}: ShiftQualityDashboardProps) {
  const {
    shifts,
    oZoneShiftStarts,
    dZoneShiftStarts,
    nZoneShiftStarts,
    oZoneShiftPct,
    dZoneShiftPct,
  } = stats;

  // Check if we have the data
  if (
    shifts == null ||
    oZoneShiftStarts == null ||
    dZoneShiftStarts == null ||
    nZoneShiftStarts == null
  ) {
    return null;
  }

  const totalZoneStarts = oZoneShiftStarts + dZoneShiftStarts + nZoneShiftStarts;
  const nZoneShiftPct =
    totalZoneStarts > 0
      ? Math.round((nZoneShiftStarts / totalZoneStarts) * 1000) / 10
      : 0;

  // Determine deployment type based on O-zone vs D-zone ratio
  const getDeploymentType = () => {
    if (oZoneShiftPct == null || dZoneShiftPct == null) return "balanced";
    const ratio = oZoneShiftPct / (dZoneShiftPct || 1);
    if (ratio > 1.3) return "offensive";
    if (ratio < 0.77) return "defensive";
    return "balanced";
  };

  const deploymentType = getDeploymentType();

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          Shift Quality
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>
                Zone start percentages show where a player's shifts begin.
                High O-zone % indicates sheltered/offensive deployment.
                High D-zone % indicates defensive/shutdown deployment.
              </p>
            </TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Zone Starts</span>
            <span>{totalZoneStarts.toFixed(0)} total</span>
          </div>
          <div className="h-6 rounded-md overflow-hidden flex">
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="bg-success/80 flex items-center justify-center text-[10px] font-semibold text-white cursor-help transition-opacity hover:opacity-90"
                  style={{ width: `${oZoneShiftPct ?? 0}%` }}
                >
                  {(oZoneShiftPct ?? 0) > 15 && `${oZoneShiftPct?.toFixed(0)}%`}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-semibold">Offensive Zone</p>
                <p className="text-sm">{oZoneShiftStarts.toFixed(0)} starts ({oZoneShiftPct?.toFixed(1)}%)</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="bg-muted-foreground/50 flex items-center justify-center text-[10px] font-semibold text-white cursor-help transition-opacity hover:opacity-90"
                  style={{ width: `${nZoneShiftPct}%` }}
                >
                  {nZoneShiftPct > 15 && `${nZoneShiftPct.toFixed(0)}%`}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-semibold">Neutral Zone</p>
                <p className="text-sm">{nZoneShiftStarts.toFixed(0)} starts ({nZoneShiftPct.toFixed(1)}%)</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="bg-error/80 flex items-center justify-center text-[10px] font-semibold text-white cursor-help transition-opacity hover:opacity-90"
                  style={{ width: `${dZoneShiftPct ?? 0}%` }}
                >
                  {(dZoneShiftPct ?? 0) > 15 && `${dZoneShiftPct?.toFixed(0)}%`}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-semibold">Defensive Zone</p>
                <p className="text-sm">{dZoneShiftStarts.toFixed(0)} starts ({dZoneShiftPct?.toFixed(1)}%)</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex justify-between text-[10px] mt-1 text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-success/80" />
              O-Zone
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-muted-foreground/50" />
              Neutral
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-error/80" />
              D-Zone
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div>
            <div className="text-2xl font-bold">{shifts.toFixed(0)}</div>
            <div className="text-xs text-muted-foreground">Total Shifts</div>
          </div>
          <div>
            <div className="text-2xl font-bold capitalize">
              {deploymentType === "offensive" && (
                <span className="text-success">Offensive</span>
              )}
              {deploymentType === "defensive" && (
                <span className="text-error">Defensive</span>
              )}
              {deploymentType === "balanced" && (
                <span className="text-muted-foreground">Balanced</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">Deployment</div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          {deploymentType === "offensive" && (
            <p>
              Getting sheltered minutes with {((oZoneShiftPct ?? 0) - (dZoneShiftPct ?? 0)).toFixed(1)}% more O-zone than D-zone starts.
            </p>
          )}
          {deploymentType === "defensive" && (
            <p>
              Trusted in defensive situations with {((dZoneShiftPct ?? 0) - (oZoneShiftPct ?? 0)).toFixed(1)}% more D-zone than O-zone starts.
            </p>
          )}
          {deploymentType === "balanced" && (
            <p>
              Receiving balanced deployment with similar zone start distribution.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
