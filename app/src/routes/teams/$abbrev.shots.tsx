import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SegmentedControl } from "@/components/layout";
import * as z from "zod/mini";
import { ShotExplorer, TeamShotHeatMaps } from "@/components/shot-explorer";
import type { DangerLevel, ScoreState } from "@/types";

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

  // Derive state from URL params with defaults
  const goalsOnly = search.goalsOnly ?? false;
  const limit = search.limit; // undefined means "all"
  const dangerLevel: DangerLevel = search.dangerLevel ?? "all";
  const scoreState: ScoreState = search.scoreState ?? "all";
  const view = search.view ?? "explorer";

  const updateSearch = (updates: {
    season?: number;
    period?: number;
    shotType?: string;
    playerId?: number;
    goalsOnly?: boolean;
    limit?: number;
    dangerLevel?: DangerLevel;
    scoreState?: ScoreState;
    view?: "explorer" | "heatmaps";
  }) => {
    navigate({
      search: (prev) => ({
        ...prev,
        ...updates,
      }),
    });
  };

  return (
    <div className="space-y-6">
      <SegmentedControl
        aria-label="Shot view"
        value={view}
        onValueChange={(view) => updateSearch({ view })}
        options={[
          { value: "explorer", label: "Shot explorer" },
          { value: "heatmaps", label: "For and against heat maps" },
        ]}
      />

      {view === "explorer" ? (
        <ShotExplorer
          teamAbbrev={abbrev}
          season={search.season}
          onSeasonChange={(season) => updateSearch({ season })}
          period={search.period}
          onPeriodChange={(period) => updateSearch({ period })}
          shotType={search.shotType}
          onShotTypeChange={(shotType) => updateSearch({ shotType })}
          playerId={search.playerId}
          onPlayerIdChange={(playerId) => updateSearch({ playerId })}
          goalsOnly={goalsOnly}
          onGoalsOnlyChange={(goalsOnly) => updateSearch({ goalsOnly })}
          limit={limit}
          onLimitChange={(limit) => updateSearch({ limit })}
          dangerLevel={dangerLevel}
          onDangerLevelChange={(dangerLevel) => updateSearch({ dangerLevel })}
          scoreState={scoreState}
          onScoreStateChange={(scoreState) => updateSearch({ scoreState })}
        />
      ) : (
        <TeamShotHeatMaps teamAbbrev={abbrev} />
      )}
    </div>
  );
}
