import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TableIcon, Info } from "lucide-react";
import {
  useOfficialStandings,
  useStandingsAnalytics,
  useSeasons,
} from "@/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared";
import { StandingsTable } from "@/components/standings";
import type { StandingsGrouping, StandingsWithAnalytics } from "@/types";
import { z } from "zod";

const searchSchema = z.object({
  grouping: z.enum(["league", "conference", "division"]).optional(),
});

export const Route = createFileRoute("/standings")({
  component: StandingsPage,
  validateSearch: searchSchema,
});

function StandingsPage() {
  const { data: seasonsData } = useSeasons();
  const currentSeason = seasonsData?.seasons?.[0]?.year;

  const navigate = useNavigate({ from: Route.fullPath });
  const { grouping = "division" } = Route.useSearch();

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

  return (
    <div className="container py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <TableIcon className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">NHL Standings</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl">
          Official NHL standings with advanced analytics overlay. View by
          division, conference, or league-wide.
        </p>
      </div>

      <Card className="mb-6 py-3 px-4">
        <div className="flex items-start gap-3">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Key Metrics: </span>
            <strong>Pts%</strong> (points earned / possible),{" "}
            <strong>xGF/xGA</strong> (expected goals for/against),{" "}
            <strong>xG±</strong> (expected goal differential),{" "}
            <strong>xPts</strong> (expected points),{" "}
            <strong>xG%</strong> (expected goals share),{" "}
            <strong>CF%/FF%</strong> (shot attempt share),{" "}
            <strong>Sh%/Sv%</strong> (shooting/save percentage),{" "}
            <strong>PDO</strong> (Sh% + Sv% - values near 100 are sustainable),{" "}
            <strong>Pts±</strong> (actual - expected points).
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <Tabs
          value={grouping}
          onValueChange={(v) =>
            navigate({ search: { grouping: v as StandingsGrouping } })
          }
        >
          <TabsList>
            <TabsTrigger value="division">Division</TabsTrigger>
            <TabsTrigger value="conference">Conference</TabsTrigger>
            <TabsTrigger value="league">League</TabsTrigger>
          </TabsList>
        </Tabs>
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
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : officialData?.teams && officialData.teams.length > 0 ? (
        <StandingsTable
          teams={teamsWithAnalytics}
          grouping={grouping}
          analyticsLoading={analyticsLoading}
        />
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <TableIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium">No standings data available</p>
            <p className="text-sm text-muted-foreground mt-1">
              Check back later when the season is in progress.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
