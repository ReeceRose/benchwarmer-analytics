import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared";
import { TopLinesCard } from "@/components/home/TopLinesCard";
import { useTopLines } from "@/hooks";
import type { Situation } from "@/types";

interface TopLinesSectionProps {
  season?: number;
  situation?: Situation;
}

export function TopLinesSection({ season, situation }: TopLinesSectionProps) {
  const { data, isLoading, error, refetch } = useTopLines(season, situation);

  if (error) {
    return (
      <ErrorState
        title="Failed to load top lines"
        message="Could not fetch line combination data."
        onRetry={refetch}
      />
    );
  }

  if (isLoading) {
    return <Skeleton className="h-64 rounded-lg" />;
  }

  if (!data) {
    return null;
  }

  return <TopLinesCard lines={data.lines} season={season} />;
}
