import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { ShotExplorer } from "@/components/shot-explorer";
import type { DangerLevel } from "@/types";

const searchSchema = z.object({
  season: z.number().optional(),
  period: z.number().optional(),
  shotType: z.string().optional(),
  playerId: z.number().optional(),
  goalsOnly: z.boolean().optional(),
  limit: z.number().optional(),
  dangerLevel: z.enum(["all", "high", "medium-high", "low"]).optional(),
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

  const updateSearch = (updates: {
    season?: number;
    period?: number;
    shotType?: string;
    playerId?: number;
    goalsOnly?: boolean;
    limit?: number;
    dangerLevel?: DangerLevel;
  }) => {
    navigate({
      search: (prev) => ({
        ...prev,
        ...updates,
      }),
    });
  };

  return (
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
    />
  );
}
