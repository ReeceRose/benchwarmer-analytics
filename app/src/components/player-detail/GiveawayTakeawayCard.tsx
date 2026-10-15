import { SplitBar, UsageCard, UsageNumber } from "@/components/player-detail/UsageCard";
import { cn } from "@/lib/utils";
import type { SkaterStats } from "@/types";
import { ZONE_COLOURS } from "@/lib/chart-colours";

// Takeaway/giveaway ratio tiers. League-wide the ratio sits around 0.3-0.4.
const RATIO_EXCEPTIONAL = 1.0; // More takeaways than giveaways: very rare
const RATIO_ELITE = 0.5; // Top ~10% of skaters
const RATIO_GOOD = 0.35; // Above league average
const RATIO_AVERAGE = 0.25; // Around league average
const RATIO_BELOW_AVERAGE = 0.15; // Bottom quartile

function rating(ratio: number): { label: string; className: string } {
  if (ratio >= RATIO_EXCEPTIONAL) return { label: "Exceptional", className: "text-success" };
  if (ratio > RATIO_ELITE) return { label: "Elite", className: "text-success" };
  if (ratio >= RATIO_GOOD) return { label: "Good", className: "text-success" };
  if (ratio >= RATIO_AVERAGE) return { label: "Average", className: "text-muted-foreground" };
  if (ratio >= RATIO_BELOW_AVERAGE) return { label: "Below average", className: "text-warning" };
  return { label: "Poor", className: "text-error" };
}

interface GiveawayTakeawayCardProps {
  stats: SkaterStats;
  className?: string;
}

export function GiveawayTakeawayCard({ stats, className }: GiveawayTakeawayCardProps) {
  const { takeaways, giveaways, dZoneGiveaways } = stats;

  if (takeaways == null || giveaways == null || giveaways === 0) {
    return (
      <UsageCard title="Puck management" className={className}>
        <p className="py-8 text-center text-sm text-muted-foreground">No giveaways recorded yet</p>
      </UsageCard>
    );
  }

  const ratio = Math.round((takeaways / giveaways) * 100) / 100;
  const { label, className: ratingClass } = rating(ratio);

  return (
    <UsageCard
      title="Puck management"
      className={className}
      caption="Takeaways per giveaway. Giveaways in the defensive zone are the costly ones."
    >
      <div className="grid grid-cols-[1fr_auto] gap-4">
        <UsageNumber
          label="Takeaway ratio"
          value={ratio.toFixed(2)}
          note={<span className={cn("font-medium", ratingClass)}>{label}</span>}
        />
        <UsageNumber label="Takeaways" value={takeaways.toFixed(0)} />
      </div>
      {dZoneGiveaways != null ? (
        <SplitBar
          label="Giveaways by zone"
          parts={[
            { label: "D-zone", value: Math.round(dZoneGiveaways), colour: ZONE_COLOURS.defensive },
            { label: "O/N-zone", value: Math.round(giveaways - dZoneGiveaways), colour: ZONE_COLOURS.neutral },
          ]}
        />
      ) : (
        <UsageNumber label="Giveaways" value={giveaways.toFixed(0)} />
      )}
    </UsageCard>
  );
}
