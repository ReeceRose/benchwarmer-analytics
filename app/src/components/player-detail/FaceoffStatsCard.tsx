import { SplitBar, UsageCard, UsageNumber } from "@/components/player-detail/UsageCard";
import { cn } from "@/lib/utils";
import type { SkaterStats, SkaterLeagueBaselinesResponse } from "@/types";

interface FaceoffStatsCardProps {
  stats: SkaterStats;
  baselines?: SkaterLeagueBaselinesResponse;
  className?: string;
}

// League average when baselines haven't loaded (wins and losses balance out).
const FALLBACK_LEAGUE_FO_PCT = 50;

function rating(pct: number): { label: string; className: string } {
  if (pct >= 55) return { label: "Elite", className: "text-success" };
  if (pct >= 52) return { label: "Above average", className: "text-success" };
  if (pct >= 48) return { label: "Average", className: "text-muted-foreground" };
  if (pct >= 45) return { label: "Below average", className: "text-warning" };
  return { label: "Poor", className: "text-error" };
}

export function FaceoffStatsCard({ stats, baselines, className }: FaceoffStatsCardProps) {
  const { faceoffsWon, faceoffsLost, faceoffPct } = stats;
  const total = (faceoffsWon ?? 0) + (faceoffsLost ?? 0);
  const leagueAvg = baselines?.faceoffPct ?? FALLBACK_LEAGUE_FO_PCT;

  if (faceoffsWon == null || faceoffsLost == null || faceoffPct == null || total < 10) {
    return (
      <UsageCard title="Faceoffs" className={className}>
        <p className="py-8 text-center text-sm text-muted-foreground">
          Fewer than 10 faceoffs taken this season
        </p>
      </UsageCard>
    );
  }

  const { label, className: ratingClass } = rating(faceoffPct);
  const diff = faceoffPct - leagueAvg;

  return (
    <UsageCard
      title="Faceoffs"
      className={className}
      caption={`League average is ${leagueAvg.toFixed(1)}%. Specialists win more than 55%.`}
    >
      <div className="flex items-end justify-between gap-4">
        <UsageNumber
          label="Win rate"
          value={`${faceoffPct.toFixed(1)}%`}
          note={<span className={cn("font-medium", ratingClass)}>{label}</span>}
        />
        <div className="text-right">
          <div className={cn("text-lg font-semibold tabular-nums", diff >= 0 ? "text-success" : "text-error")}>
            {diff >= 0 ? "+" : ""}
            {diff.toFixed(1)}
          </div>
          <div className="text-xs text-muted-foreground">vs league</div>
        </div>
      </div>
      <SplitBar
        label="Faceoffs"
        parts={[
          { label: "Won", value: Math.round(faceoffsWon), colour: "var(--success)" },
          { label: "Lost", value: Math.round(faceoffsLost), colour: "var(--error)" },
        ]}
      />
    </UsageCard>
  );
}
