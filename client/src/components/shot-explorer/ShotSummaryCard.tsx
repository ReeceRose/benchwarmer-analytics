import { Card, CardContent } from "@/components/ui/card";
import type { ShotSummary } from "@/types";

interface ShotSummaryCardProps {
  summary: ShotSummary;
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
      ? "text-green-600 dark:text-green-400"
      : highlight === "negative"
        ? "text-red-600 dark:text-red-400"
        : "text-foreground";

  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${colorClass}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export function ShotSummaryCard({ summary }: ShotSummaryCardProps) {
  const goalsAboveExpected = summary.goalsAboveExpected;
  const luckHighlight =
    goalsAboveExpected > 0.5
      ? "positive"
      : goalsAboveExpected < -0.5
        ? "negative"
        : "neutral";

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-4">
          <StatItem label="Shots" value={summary.totalShots} />
          <StatItem label="On Goal" value={summary.shotsOnGoal} />
          <StatItem label="Goals" value={summary.goals} />
          <StatItem label="Sh%" value={`${summary.shootingPct}%`} />
          <StatItem label="xG" value={summary.totalXGoal.toFixed(1)} />
          <StatItem
            label="G - xG"
            value={
              goalsAboveExpected >= 0
                ? `+${goalsAboveExpected.toFixed(1)}`
                : goalsAboveExpected.toFixed(1)
            }
            highlight={luckHighlight}
          />
          <StatItem label="High Danger" value={summary.highDangerShots} />
          <StatItem label="Med Danger" value={summary.mediumDangerShots} />
          <StatItem label="Low Danger" value={summary.lowDangerShots} />
        </div>
      </CardContent>
    </Card>
  );
}
