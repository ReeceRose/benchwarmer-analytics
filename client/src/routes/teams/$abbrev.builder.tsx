import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Wrench } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BackButton, SeasonSelector, ErrorState } from "@/components/shared";
import { LineBuilder } from "@/components/line-builder";
import { useTeam, useTeamRoster, useChemistryMatrix, useTeamSeasons } from "@/hooks";

const searchSchema = z.object({
  season: z.number().optional(),
});

export const Route = createFileRoute("/teams/$abbrev/builder")({
  component: TeamLineBuilderPage,
  validateSearch: searchSchema,
});

function TeamLineBuilderPage() {
  const { abbrev } = Route.useParams();
  const search = Route.useSearch();

  // Get team info
  const { data: team } = useTeam(abbrev);

  // Get available seasons for this team
  const { data: seasonsData } = useTeamSeasons(abbrev);
  const defaultSeason = seasonsData?.seasons?.[0]?.year;
  const season = search.season ?? defaultSeason;

  // Fetch roster
  const {
    data: rosterData,
    isLoading: rosterLoading,
    error: rosterError,
    refetch: refetchRoster,
  } = useTeamRoster(abbrev, season);

  // Fetch chemistry matrix for pair stats
  const {
    data: chemistryData,
    isLoading: chemistryLoading,
    error: chemistryError,
    refetch: refetchChemistry,
  } = useChemistryMatrix(abbrev, {
    season: season!,
    situation: "5on5",
  });

  const isLoading = rosterLoading || chemistryLoading;
  const error = rosterError || chemistryError;

  return (
    <div className="container py-8">
      <BackButton
        fallbackPath={`/teams/${abbrev}`}
        label={team?.name || abbrev}
      />

      <div className="mb-6 mt-4">
        <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <Wrench className="h-8 w-8" />
          Line Builder
        </h1>
        <p className="text-muted-foreground">
          Build custom line combinations and see historical chemistry stats when
          players have played together.
        </p>
      </div>

      {/* Season Selector */}
      <div className="flex items-center gap-3 mb-6">
        <SeasonSelector
          value={season}
          onValueChange={(s) => {
            // Update URL with new season
            window.history.replaceState(
              null,
              "",
              `/teams/${abbrev}/builder?season=${s}`
            );
            // Trigger re-render
            window.location.reload();
          }}
          teamAbbrev={abbrev}
        />
      </div>

      {/* Error State */}
      {error && (
        <ErrorState
          title="Failed to load data"
          message="Could not fetch roster or chemistry data. Please try again."
          onRetry={() => {
            refetchRoster();
            refetchChemistry();
          }}
          variant="inline"
        />
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Skeleton className="h-[600px] w-full rounded-lg" />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        </div>
      )}

      {/* No Season Selected */}
      {!season && !isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="font-medium">Select a season to start building lines</p>
          </CardContent>
        </Card>
      )}

      {/* Line Builder */}
      {!isLoading && !error && rosterData && season && (
        <LineBuilder
          roster={rosterData.players}
          chemistryPairs={chemistryData?.pairs ?? []}
        />
      )}
    </div>
  );
}
