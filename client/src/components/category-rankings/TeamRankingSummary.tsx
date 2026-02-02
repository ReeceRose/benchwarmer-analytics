import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RankBadge } from "@/components/category-rankings/RankBadge";
import type { TeamCategoryRanks } from "@/types";

interface TeamRankingSummaryProps {
  rankings: TeamCategoryRanks | undefined;
  isLoading?: boolean;
}

const categories = [
  { key: "overallRank", label: "OVR", valueKey: "overallScore", format: (v: number) => v.toFixed(1) },
  { key: "xGoalsPctRank", label: "xG%", valueKey: "xGoalsPct", format: (v: number) => `${v.toFixed(1)}%` },
  { key: "goalsForRank", label: "GF", valueKey: "goalsFor", format: (v: number) => String(v) },
  { key: "goalsAgainstRank", label: "GA", valueKey: "goalsAgainst", format: (v: number) => String(v) },
  { key: "goalDifferentialRank", label: "DIFF", valueKey: "goalDifferential", format: (v: number) => (v > 0 ? `+${v}` : String(v)) },
  { key: "ppPctRank", label: "PP%", valueKey: "ppPct", format: (v: number) => `${v.toFixed(1)}%` },
  { key: "pkPctRank", label: "PK%", valueKey: "pkPct", format: (v: number) => `${v.toFixed(1)}%` },
  { key: "corsiPctRank", label: "CF%", valueKey: "corsiPct", format: (v: number) => `${v.toFixed(1)}%` },
  { key: "highDangerForRank", label: "HDCF", valueKey: "highDangerChancesFor", format: (v: number) => String(v) },
  { key: "highDangerAgainstRank", label: "HDCA", valueKey: "highDangerChancesAgainst", format: (v: number) => String(v) },
] as const;

export function TeamRankingSummary({ rankings, isLoading }: TeamRankingSummaryProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">League Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-7 w-8" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!rankings) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">League Rankings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4">
          {categories.map(({ key, label, valueKey, format }) => {
            const rank = rankings[key as keyof TeamCategoryRanks] as number;
            const value = rankings[valueKey as keyof TeamCategoryRanks] as number | undefined;

            return (
              <div key={key} className="flex flex-col items-center gap-1">
                <span className="text-xs text-muted-foreground">{label}</span>
                <RankBadge
                  rank={rank}
                  value={value}
                  label={label}
                  format={format}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
