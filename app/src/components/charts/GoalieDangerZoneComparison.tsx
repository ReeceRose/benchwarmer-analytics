import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComparisonBars } from "@/components/charts/ComparisonBars";
import { fitDomain } from "@/components/charts/comparison-utils";
import type { GoalieStats } from "@/types";

interface GoalieData {
  name: string;
  stats: GoalieStats | null | undefined;
  color?: string;
}

interface GoalieDangerZoneComparisonProps {
  players: GoalieData[];
  leagueAverages?: {
    lowDanger: number;
    mediumDanger: number;
    highDanger: number;
  };
  title?: string;
  className?: string;
}

// Fallback baselines if league averages aren't provided by the API.
// MoneyPuck defines danger zones by xG probability:
// Low (<0.08), Medium (>=0.08 and <0.20), High (>=0.20).
const DEFAULT_LEAGUE_AVERAGES = {
  lowDanger: 0.965,
  mediumDanger: 0.915,
  highDanger: 0.865,
};

interface DangerZoneStats {
  lowSvPct: number | null;
  medSvPct: number | null;
  highSvPct: number | null;
}

function calculateDangerZoneStats(stats: GoalieStats): DangerZoneStats {
  const calcSavePct = (shots: number, goals: number): number | null => {
    if (shots === 0) return null;
    return (shots - goals) / shots;
  };

  return {
    lowSvPct: calcSavePct(stats.lowDangerShots, stats.lowDangerGoals),
    medSvPct: calcSavePct(stats.mediumDangerShots, stats.mediumDangerGoals),
    highSvPct: calcSavePct(stats.highDangerShots, stats.highDangerGoals),
  };
}

/** Each goalie's save percentage by shot danger, against the league average. */
export function GoalieDangerZoneComparison({
  players,
  leagueAverages,
  title = "Danger zone comparison",
  className,
}: GoalieDangerZoneComparisonProps) {
  const valid = players.filter((p): p is GoalieData & { stats: GoalieStats } => p.stats != null);
  const zoneStats = valid.map((p) => calculateDangerZoneStats(p.stats));
  if (!zoneStats.some((z) => z.lowSvPct != null || z.medSvPct != null || z.highSvPct != null)) {
    return null;
  }

  const baselines = leagueAverages ?? DEFAULT_LEAGUE_AVERAGES;
  const format = (v: number) => v.toFixed(3).replace(/^0/, "");
  const zone = (label: string, key: keyof DangerZoneStats, league: number) => {
    const values = zoneStats.map((z) => z[key]);
    return {
      label,
      values,
      format,
      domain: fitDomain(values, { reference: league, max: 1 }),
      reference: { value: league, label: "League" },
    };
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ComparisonBars
          series={valid.map((p) => ({ name: p.name, colour: p.color }))}
          rows={[
            zone("Low danger", "lowSvPct", baselines.lowDanger),
            zone("Medium danger", "medSvPct", baselines.mediumDanger),
            zone("High danger", "highSvPct", baselines.highDanger),
          ]}
        />
        <p className="mt-3 text-xs text-muted-foreground">
          Save percentage on shots of each danger level, on a range fitted to these goalies. The tick is the league average.
        </p>
      </CardContent>
    </Card>
  );
}
