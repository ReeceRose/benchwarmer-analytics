import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Circle, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShotExplorer, TeamShotHeatMaps } from "@/components/shot-explorer";
import type { DangerLevel, ScoreState } from "@/types";

const searchSchema = z.object({
  season: z.number().optional(),
  period: z.number().optional(),
  shotType: z.string().optional(),
  playerId: z.number().optional(),
  goalsOnly: z.boolean().optional(),
  limit: z.number().optional(),
  dangerLevel: z.enum(["all", "high", "medium-high", "low"]).optional(),
  scoreState: z.enum(["all", "leading", "trailing", "tied"]).optional(),
  view: z.enum(["explorer", "heatmaps"]).optional(),
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
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-md border p-1">
          <Button
            variant={view === "explorer" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-3"
            onClick={() => updateSearch({ view: "explorer" })}
          >
            <Circle className="h-3.5 w-3.5 mr-1.5" />
            Shot Explorer
          </Button>
          <Button
            variant={view === "heatmaps" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-3"
            onClick={() => updateSearch({ view: "heatmaps" })}
          >
            <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
            For/Against Heat Maps
          </Button>
        </div>
      </div>

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
