import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared";
import { Panel, Section } from "@/components/layout";
import { TopLinesCard } from "@/components/home/TopLinesCard";
import { useTopLines } from "@/hooks";

interface TopLinesSectionProps {
  season?: number;
}

export function TopLinesSection({ season }: TopLinesSectionProps) {
  const { data, isLoading, error, refetch } = useTopLines(season, "5on5");

  return (
    <Section title="Best lines at 5v5" description="Ranked by share of expected goals.">
      {error ? (
        <ErrorState
          title="Couldn't load lines"
          message="The line combinations request failed."
          onRetry={refetch}
        />
      ) : (
        <Panel>
          {isLoading || !data ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-6 rounded-full" />
                  <Skeleton className="h-8 w-20 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-7 w-14" />
                </div>
              ))}
            </div>
          ) : (
            <TopLinesCard lines={data.lines} season={season} />
          )}
        </Panel>
      )}
    </Section>
  );
}
