import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared";
import { LeaderStrip } from "@/components/home/LeaderStrip";
import { useHomeLeaders } from "@/hooks";
import type { Situation } from "@/types";

interface LeaderStripSectionProps {
  season?: number;
  situation?: Situation;
}

export function LeaderStripSection({ season, situation }: LeaderStripSectionProps) {
  const { leaders, goalieLeaders, isLoading, error, refetch } = useHomeLeaders(season, situation);

  if (error) {
    return (
      <section>
        <h2 className="text-lg font-semibold mb-3">League Leaders</h2>
        <ErrorState
          title="Failed to load leaders"
          message="Could not fetch leaderboard data."
          onRetry={refetch}
        />
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-lg font-semibold mb-3">League Leaders</h2>
      {isLoading ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-70 shrink-0 rounded-lg" />
          ))}
        </div>
      ) : leaders ? (
        <LeaderStrip
          leaders={leaders}
          goalieLeaders={goalieLeaders}
          season={season}
          situation={situation}
        />
      ) : null}
    </section>
  );
}
