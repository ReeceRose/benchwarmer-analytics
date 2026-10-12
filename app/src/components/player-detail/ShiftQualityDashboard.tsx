import { SplitBar, UsageCard, UsageNumber } from "@/components/player-detail/UsageCard";
import type { SkaterStats } from "@/types";

interface ShiftQualityDashboardProps {
  stats: SkaterStats;
  className?: string;
}

const DEPLOYMENT = {
  offensive: "Offensive",
  defensive: "Defensive",
  balanced: "Balanced",
} as const;

export function ShiftQualityDashboard({ stats, className }: ShiftQualityDashboardProps) {
  const { shifts, oZoneShiftStarts, dZoneShiftStarts, nZoneShiftStarts, oZoneShiftPct, dZoneShiftPct } =
    stats;

  if (shifts == null || oZoneShiftStarts == null || dZoneShiftStarts == null || nZoneShiftStarts == null) {
    return null;
  }

  // Deployment from the O-zone to D-zone start ratio.
  const ratio = oZoneShiftPct != null && dZoneShiftPct != null ? oZoneShiftPct / (dZoneShiftPct || 1) : 1;
  const deployment: keyof typeof DEPLOYMENT =
    ratio > 1.3 ? "offensive" : ratio < 0.77 ? "defensive" : "balanced";
  const gap = Math.abs((oZoneShiftPct ?? 0) - (dZoneShiftPct ?? 0)).toFixed(1);

  const summary = {
    offensive: `Sheltered minutes: ${gap} points more O-zone than D-zone starts.`,
    defensive: `Trusted with defensive minutes: ${gap} points more D-zone than O-zone starts.`,
    balanced: "Starts spread evenly between the offensive and defensive zones.",
  }[deployment];

  return (
    <UsageCard
      title="Zone starts"
      className={className}
      caption="Where shifts begin. More O-zone starts usually means sheltered, offensive minutes; more D-zone starts, shutdown minutes."
    >
      <div className="grid grid-cols-2 gap-4">
        <UsageNumber label="Deployment" value={DEPLOYMENT[deployment]} />
        <UsageNumber label="Shifts" value={shifts.toFixed(0)} />
      </div>
      <SplitBar
        label="Starts by zone"
        parts={[
          { label: "O-zone", value: Math.round(oZoneShiftStarts), colour: "var(--chart-1)" },
          { label: "Neutral", value: Math.round(nZoneShiftStarts), colour: "color-mix(in oklab, var(--muted-foreground) 40%, transparent)" },
          { label: "D-zone", value: Math.round(dZoneShiftStarts), colour: "var(--chart-5)" },
        ]}
      />
      <p className="text-sm text-muted-foreground">{summary}</p>
    </UsageCard>
  );
}
