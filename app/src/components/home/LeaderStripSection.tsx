import { Link } from "@tanstack/react-router";
import { ErrorState } from "@/components/shared";
import { Section } from "@/components/layout";
import { LeaderGrid, LeaderGridSkeleton } from "@/components/home/LeaderGrid";
import { useHomeLeaders } from "@/hooks";
import type { Situation } from "@/types";

interface LeaderStripSectionProps {
  season?: number;
  situation?: Situation;
}

export function LeaderStripSection({ season, situation }: LeaderStripSectionProps) {
  const { leaders, goalieLeaders, isLoading, error, refetch } = useHomeLeaders(season, situation);

  return (
    <Section
      title="League leaders"
      action={
        <Link
          to="/leaderboards"
          search={{ season, situation }}
          className="font-semibold text-link hover:underline"
        >
          All leaderboards
        </Link>
      }
    >
      {error ? (
        <ErrorState
          title="Couldn't load leaders"
          message="The leaderboard request failed."
          onRetry={refetch}
        />
      ) : isLoading || !leaders ? (
        <LeaderGridSkeleton />
      ) : (
        <LeaderGrid
          leaders={leaders}
          goalieLeaders={goalieLeaders}
          season={season}
          situation={situation}
        />
      )}
    </Section>
  );
}
