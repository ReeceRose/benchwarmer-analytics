import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared";
import { TopLinesCard } from "@/components/home/TopLinesCard";
import { useTopLines } from "@/hooks";

interface TopLinesSectionProps {
  season?: number;
}

export function TopLinesSection({ season }: TopLinesSectionProps) {
  const { data, isLoading, error, refetch } = useTopLines(season, "5on5");

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
