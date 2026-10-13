import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as z from "zod/mini";
import { EmptyState, SegmentedControl } from "@/components/layout";
import { SeasonSelector } from "@/components/shared/SeasonSelector";
import { ShotExplorer, TeamShotHeatMaps } from "@/components/shot-explorer";
import { Skeleton } from "@/components/ui/skeleton";
import { useTeamSeasons } from "@/hooks";

const searchSchema = z.object({
  season: z.optional(z.number()),
  period: z.optional(z.number()),
  shotType: z.optional(z.string()),
  playerId: z.optional(z.number()),
  goalsOnly: z.optional(z.boolean()),
  limit: z.optional(z.number()),
  dangerLevel: z.optional(z.enum(["all", "high", "medium-high", "low"])),
  scoreState: z.optional(z.enum(["all", "leading", "trailing", "tied"])),
  view: z.optional(z.enum(["explorer", "heatmaps"])),
});

export const Route = createFileRoute("/teams/$abbrev/shots")({
  component: TeamShotsPage,
  validateSearch: searchSchema,
});

function TeamShotsPage() {
  const { abbrev } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data: seasonsData, isLoading: seasonsLoading } = useTeamSeasons(abbrev);

  const season = search.season ?? seasonsData?.seasons[0]?.year;
  const view = search.view ?? "explorer";

  const updateSearch = (updates: Partial<typeof search>) => {
    navigate({ search: (prev) => ({ ...prev, ...updates }) });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Shots</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {view === "explorer"
              ? "Every unblocked shot attempt, sized and coloured by expected goals."
              : "Where the team shoots from, next to where its opponents shoot from."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            aria-label="Shot view"
            value={view}
            onValueChange={(view) => updateSearch({ view })}
            options={[
              { value: "explorer", label: "Shot map" },
              { value: "heatmaps", label: "For and against" },
            ]}
          />
          <SeasonSelector
            value={season}
            onValueChange={(season) => updateSearch({ season })}
            teamAbbrev={abbrev}
          />
        </div>
      </div>

      {season === undefined ? (
        seasonsLoading ? (
          <Skeleton className="h-96 rounded-2xl" />
        ) : (
          <EmptyState title="No shot data for this team" hint="Try another team." />
        )
      ) : view === "explorer" ? (
        <ShotExplorer
          teamAbbrev={abbrev}
          season={season}
          period={search.period}
          onPeriodChange={(period) => updateSearch({ period })}
          shotType={search.shotType}
          onShotTypeChange={(shotType) => updateSearch({ shotType })}
          playerId={search.playerId}
          onPlayerIdChange={(playerId) => updateSearch({ playerId })}
          goalsOnly={search.goalsOnly ?? false}
          onGoalsOnlyChange={(goalsOnly) => updateSearch({ goalsOnly: goalsOnly || undefined })}
          limit={search.limit}
          onLimitChange={(limit) => updateSearch({ limit })}
          dangerLevel={search.dangerLevel ?? "all"}
          onDangerLevelChange={(dangerLevel) => updateSearch({ dangerLevel })}
          scoreState={search.scoreState ?? "all"}
          onScoreStateChange={(scoreState) => updateSearch({ scoreState })}
          onClearFilters={() => navigate({ search: { season: search.season, view: search.view } })}
        />
      ) : (
        <TeamShotHeatMaps teamAbbrev={abbrev} season={season} />
      )}
    </div>
  );
}
