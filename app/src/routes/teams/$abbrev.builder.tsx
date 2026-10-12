import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { EmptyState } from "@/components/layout";
import * as z from "zod/mini";
import { Skeleton } from "@/components/ui/skeleton";
import { SeasonSelector, ErrorState } from "@/components/shared";
import { LineBuilder } from "@/components/line-builder";
import { useTeamRoster, useChemistryMatrix, useTeamSeasons } from "@/hooks";

const searchSchema = z.object({
  season: z.optional(z.number()),
});

export const Route = createFileRoute("/teams/$abbrev/builder")({
  component: TeamLineBuilderPage,
  validateSearch: searchSchema,
});

function TeamLineBuilderPage() {
  const { abbrev } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Line builder</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Drag players into a line to see how they've done together.
          </p>
        </div>
        <SeasonSelector
          value={season}
          onValueChange={(s) => {
            navigate({ search: { season: s } });
          }}
          teamAbbrev={abbrev}
        />
      </div>
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
      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Skeleton className="h-150 w-full rounded-2xl" />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        </div>
      )}
      {!season && !isLoading && (
        <EmptyState
          title="No seasons recorded for this team"
          hint="The line builder needs a season with games played."
        />
      )}
      {!isLoading && !error && rosterData && season && (
        <LineBuilder
          roster={rosterData.players}
          chemistryPairs={chemistryData?.pairs ?? []}
        />
      )}
    </div>
  );
}
