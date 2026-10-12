import { cn } from "@/lib/utils";
import type { ShotSummary } from "@/types";

interface ShotSummaryCardProps {
  summary: ShotSummary;
  className?: string;
}

function StatItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: "positive" | "negative" | "neutral";
}) {
  const colorClass =
    highlight === "positive"
      ? "text-success"
      : highlight === "negative"
        ? "text-error"
        : "text-foreground";

  return (
    <div className="bg-card px-3 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("font-display text-xl font-bold tabular-nums", colorClass)}>
        {value}
      </div>
    </div>
  );
}

export function ShotSummaryCard({ summary, className }: ShotSummaryCardProps) {
  const goalsAboveExpected = summary.goalsAboveExpected;
  const luckHighlight =
    goalsAboveExpected > 0.5
      ? "positive"
      : goalsAboveExpected < -0.5
        ? "negative"
        : "neutral";

  return (
    <div
      className={cn(
        "grid h-fit grid-cols-3 gap-px overflow-hidden rounded-xl border bg-border",
        className,
      )}
    >
          <StatItem label="Shots" value={summary.totalShots} />
          <StatItem label="On goal" value={summary.shotsOnGoal} />
          <StatItem label="Goals" value={summary.goals} />
          <StatItem label="Sh%" value={`${summary.shootingPct}%`} />
          <StatItem label="xG" value={summary.totalXGoal.toFixed(1)} />
          <StatItem
            label="Goals vs xG"
            value={
              goalsAboveExpected >= 0
                ? `+${goalsAboveExpected.toFixed(1)}`
                : goalsAboveExpected.toFixed(1)
            }
            highlight={luckHighlight}
          />
          <StatItem label="High danger" value={summary.highDangerShots} />
          <StatItem label="Medium danger" value={summary.mediumDangerShots} />
          <StatItem label="Low danger" value={summary.lowDangerShots} />
    </div>
  );
}
