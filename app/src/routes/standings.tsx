import { useMemo } from "react";
import { seasonsQueryOptions } from "@/hooks/useSeasons";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  useOfficialStandings,
  useStandingsAnalytics,
  useSeasons,
  usePageTitle,
} from "@/hooks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, TableSkeleton } from "@/components/shared";
import {
  MetricGuide,
  PageHeader,
  SegmentedControl,
  ViewToggle,
} from "@/components/layout";
import { StandingsTable } from "@/components/standings";
import {
  PointsLuckChart,
  GoalDifferentialChart,
  PDODistributionChart,
} from "@/components/standings/charts";
import type { StandingsGrouping, StandingsWithAnalytics } from "@/types";
import * as z from "zod/mini";

const searchSchema = z.object({
  grouping: z.optional(z.enum(["league", "conference", "division"])),
  view: z.optional(z.enum(["charts", "table"])),
});

export const Route = createFileRoute("/standings")({
  component: StandingsPage,
  loader: ({ context }) =>
    context.queryClient.prefetchQuery(seasonsQueryOptions),
  validateSearch: searchSchema,
});

function StandingsPage() {
  usePageTitle("Standings");

  const { data: seasonsData } = useSeasons();
  const currentSeason = seasonsData?.seasons?.[0]?.year;

  const navigate = useNavigate({ from: Route.fullPath });
  const { grouping = "division", view: urlView } = Route.useSearch();

  // View state from URL with default to table
  const currentView = urlView ?? "table";

  // Fetch current standings (no season param = live data)
  const {
    data: officialData,
    isLoading: officialLoading,
    error: officialError,
    refetch: refetchOfficial,
  } = useOfficialStandings();

  const {
    data: analyticsData,
    isLoading: analyticsLoading,
    refetch: refetchAnalytics,
  } = useStandingsAnalytics(currentSeason);

  // Merge analytics into standings by abbreviation
  const teamsWithAnalytics = useMemo((): StandingsWithAnalytics[] => {
    if (!officialData?.teams) return [];
    const analyticsMap = new Map(
      analyticsData?.teams.map((t) => [t.abbreviation, t]) ?? [],
    );
    return officialData.teams.map((team) => ({
      ...team,
      analytics: analyticsMap.get(team.abbreviation),
    }));
  }, [officialData, analyticsData]);

  const updateSearch = (
    updates: Partial<{ grouping: StandingsGrouping; view: "charts" | "table" }>,
  ) => {
    navigate({ search: (prev) => ({ ...prev, ...updates }) });
  };

  return (
    <div className="container space-y-6 py-8">
      <PageHeader
        title="Standings"
        description="Official NHL standings alongside the underlying numbers that predict where teams are heading."
        actions={
          <Button variant="outline" asChild>
            <Link to="/category-rankings">Category rankings</Link>
          </Button>
        }
      />

      <MetricGuide
        metrics={["Pts%", "xG±", "xPts", "xG%", "CF%", "FF%", "Sh%", "Sv%", "PDO", "Pts±"]}
      >
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-success" />
            Top three in the division
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="rounded-full border border-chart-4/70 bg-chart-4/10 px-1.5 text-[10px] font-semibold text-chart-4">
              WC
            </span>
            Wild card (two per conference)
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-6 border-t-2 border-dashed border-primary/40" />
            Playoff cut line
          </span>
        </div>
      </MetricGuide>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {currentView === "table" ? (
          <SegmentedControl
            aria-label="Group by"
            value={grouping}
            onValueChange={(grouping) => updateSearch({ grouping })}
            options={[
              { value: "division", label: "Division" },
              { value: "conference", label: "Conference" },
              { value: "league", label: "League" },
            ]}
          />
        ) : (
          <span />
        )}
        <ViewToggle
          value={currentView}
          onValueChange={(view) => updateSearch({ view })}
        />
      </div>

      {officialError && (
        <ErrorState
          title="Failed to load standings"
          message="Could not fetch NHL standings. Please try again."
          onRetry={() => {
            refetchOfficial();
            refetchAnalytics();
          }}
        />
      )}

      {officialLoading ? (
        <TableSkeleton rows={8} />
      ) : officialData?.teams && officialData.teams.length > 0 ? (
        currentView === "charts" ? (
          <ChartsView
            teams={teamsWithAnalytics}
            analyticsLoading={analyticsLoading}
          />
        ) : (
          <StandingsTable
            teams={teamsWithAnalytics}
            grouping={grouping}
            analyticsLoading={analyticsLoading}
            season={currentSeason}
          />
        )
      ) : (
        <p className="py-12 text-center text-muted-foreground">
          No standings yet. They appear once the season's first games are played.
        </p>
      )}
    </div>
  );
}

// Charts View Component
function ChartsView({
  teams,
  analyticsLoading,
}: {
  teams: StandingsWithAnalytics[];
  analyticsLoading?: boolean;
}) {
  if (analyticsLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PointsLuckChart teams={teams} />
        <PDODistributionChart teams={teams} />
      </div>

      <GoalDifferentialChart teams={teams} />
    </div>
  );
}
