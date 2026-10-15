import { Panel, StatTile } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";
import { SplitBar } from "@/components/player-detail/UsageCard";
import { formatSigned } from "@/components/shot-explorer/shot-utils";
import { SHOT_DANGER_COLOURS } from "@/lib/chart-colours";
import { cn } from "@/lib/utils";
import type { ShotSummary } from "@/types";

interface ShotSummaryCardProps {
  summary: ShotSummary;
  className?: string;
}

/** Headline shot numbers plus the high / medium / low danger split. */
export function ShotSummaryCard({ summary, className }: ShotSummaryCardProps) {
  const gax = summary.goalsAboveExpected;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid grid-cols-2 gap-4">
        <StatTile
          label="Shots"
          value={summary.totalShots}
          note={`${summary.shotsOnGoal} on goal`}
        />
        <StatTile
          label="Goals"
          value={summary.goals}
          note={`${summary.shootingPct.toFixed(1)}% of shots`}
        />
        <StatTile
          label="xG"
          value={summary.totalXGoal.toFixed(1)}
          note="Expected goals"
        />
        <StatTile
          label="Goals vs xG"
          value={
            // Above or below xG isn't good or bad on its own, so no green/red.
            <span>{formatSigned(gax)}</span>
          }
          note={gax >= 0 ? "Finishing above expected" : "Finishing below expected"}
        />
      </div>
      <Panel>
        <SplitBar
          label="Shot danger"
          parts={[
            { label: "High", value: summary.highDangerShots, colour: SHOT_DANGER_COLOURS.highDanger },
            { label: "Medium", value: summary.mediumDangerShots, colour: SHOT_DANGER_COLOURS.mediumDanger },
            { label: "Low", value: summary.lowDangerShots, colour: SHOT_DANGER_COLOURS.lowDanger },
          ]}
        />
      </Panel>
    </div>
  );
}

/** Same footprint as `ShotSummaryCard`. */
export function ShotSummaryCardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-27 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-24 rounded-2xl" />
    </div>
  );
}
