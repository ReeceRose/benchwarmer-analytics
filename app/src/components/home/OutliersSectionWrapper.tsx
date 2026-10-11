import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared";
import { LuckChart } from "@/components/home/LuckChart";
import { OutliersSection } from "@/components/home/OutliersSection";
import { useOutliers } from "@/hooks";
import type { Situation } from "@/types";

interface OutliersSectionWrapperProps {
  season?: number;
  situation?: Situation;
}

export function OutliersSectionWrapper({ season, situation }: OutliersSectionWrapperProps) {
  const { data, isLoading, error, refetch } = useOutliers(season, situation);

  if (error) {
    return (
      <section className="space-y-4">
        <ErrorState
          title="Failed to load outliers"
          message="Could not fetch outlier data."
          onRetry={refetch}
        />
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="space-y-4">
        <Skeleton className="h-64 rounded-lg" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-lg" />
          <Skeleton className="h-80 rounded-lg" />
        </div>
      </section>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <section className="space-y-4">
      <LuckChart
        runningHot={data.skaterOutliers.runningHot}
        runningCold={data.skaterOutliers.runningCold}
      />
      <OutliersSection
        runningHot={data.skaterOutliers.runningHot}
        runningCold={data.skaterOutliers.runningCold}
        goalieRunningHot={data.goalieOutliers?.runningHot}
        goalieRunningCold={data.goalieOutliers?.runningCold}
      />
    </section>
  );
}
