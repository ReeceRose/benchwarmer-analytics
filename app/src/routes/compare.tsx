import { useMemo, useState } from "react";
import { EmptyState, PageHeader, Section, SegmentedControl } from "@/components/layout";
import { seasonsQueryOptions } from "@/hooks/useSeasons";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as z from "zod/mini";
import {
  usePlayerComparison,
  useSeasons,
  usePlayers,
  usePageTitle,
  useGoalieLeagueBaselines,
} from "@/hooks";
import { getCurrentSeason } from "@/lib/date-utils";
import { getDangerZoneLeagueAveragesFromGoalieBaselines } from "@/lib/goalie-baselines";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SeasonSelector, ErrorState, TableSkeleton } from "@/components/shared";
import { StatComparisonChart, GoalieComparison, GoalieDangerZoneComparison } from "@/components/charts";
import {
  SelectedPlayersCard,
  ComparisonTable,
  type StatMode,
} from "@/components/compare";
import type { Player, Situation } from "@/types";

const searchSchema = z.object({
  ids: z.optional(z.string()),
  season: z.optional(z.number()),
  situation: z.optional(z.string()),
});

export const Route = createFileRoute("/compare")({
  component: ComparePage,
  loader: ({ context }) =>
    context.queryClient.prefetchQuery(seasonsQueryOptions),
  validateSearch: searchSchema,
});

const SITUATIONS = [
  { value: "all", label: "All situations" },
  { value: "5on5", label: "5v5" },
  { value: "5on4", label: "5v4 (power play)" },
  { value: "4on5", label: "4v5 (penalty kill)" },
] as const;

function ComparePage() {
  usePageTitle("Compare Players");

  // Use calculated default season immediately - don't wait for API
  const calculatedSeason = getCurrentSeason();
  const { data: seasonsData } = useSeasons();

  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  // Parse IDs from URL
  const selectedIds = useMemo(() => {
    if (!search.ids) return [];
    return search.ids
      .split(",")
      .map((id) => parseInt(id, 10))
      .filter((id) => !isNaN(id));
  }, [search.ids]);

  // Prefer URL param > API current season > calculated default
  const season = search.season ?? seasonsData?.seasons?.[0]?.year ?? calculatedSeason;
  const situation = (search.situation as Situation) || "all";

  // Fetch basic player info for all selected players (even if only 1)
  const { data: selectedPlayers, isLoading: playersLoading } = usePlayers(selectedIds);

  // Fetch comparison data (only when 2+ players)
  const {
    data: comparisonData,
    isLoading,
    error,
    refetch,
  } = usePlayerComparison(selectedIds, season, situation);

  // Update URL params
  const updateSearch = (updates: {
    ids?: string;
    season?: number;
    situation?: Situation;
  }) => {
    navigate({
      search: (prev) => ({
        ...prev,
        ...updates,
      }),
    });
  };

  // Add player to comparison
  const addPlayer = (player: Player) => {
    if (selectedIds.length >= 5) return;
    if (selectedIds.includes(player.id)) return;

    const newIds = [...selectedIds, player.id];
    updateSearch({ ids: newIds.join(",") });
  };

  // Remove player from comparison
  const removePlayer = (playerId: number) => {
    const newIds = selectedIds.filter((id) => id !== playerId);
    updateSearch({ ids: newIds.length > 0 ? newIds.join(",") : undefined });
  };

  // Determine if we're comparing goalies or skaters based on first selected player
  const selectedPositionType = useMemo(() => {
    if (!selectedPlayers || selectedPlayers.length === 0) return null;
    const firstPlayer = selectedPlayers[0];
    return firstPlayer?.position === "G" ? "goalie" : "skater";
  }, [selectedPlayers]);

  const baselineSeasons = selectedPositionType === "goalie" ? [season] : [];
  const { data: goalieBaselines } = useGoalieLeagueBaselines(
    baselineSeasons,
    situation,
    false
  );

  const dangerLeagueAverages = useMemo(() => {
    return getDangerZoneLeagueAveragesFromGoalieBaselines(goalieBaselines);
  }, [goalieBaselines]);

  const hasComparisonData =
    !isLoading && !error && comparisonData && comparisonData.players.length >= 2;

  const [statMode, setStatMode] = useState<StatMode>("all");

  return (
    <div className="container space-y-6 py-8">
      <PageHeader
        title="Compare players"
        description="Put up to five skaters or goalies side by side."
        actions={
          <>
            <SeasonSelector
              value={season}
              onValueChange={(s) => updateSearch({ season: s })}
            />
            <Select
              value={situation}
              onValueChange={(s) => updateSearch({ situation: s as Situation })}
            >
              <SelectTrigger className="w-40" aria-label="Situation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SITUATIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <SegmentedControl
              aria-label="Stat type"
              value={statMode}
              onValueChange={setStatMode}
              options={[
                { value: "all", label: "All stats" },
                { value: "counting", label: "Totals" },
                { value: "rate", label: "Per 60" },
              ]}
            />
          </>
        }
      />
      <SelectedPlayersCard
        selectedIds={selectedIds}
        selectedPlayers={selectedPlayers}
        playersLoading={playersLoading}
        selectedPositionType={selectedPositionType}
        onAddPlayer={addPlayer}
        onRemovePlayer={removePlayer}
      />
      {error && selectedIds.length >= 2 && (
        <ErrorState
          title="Comparison failed"
          message="Could not load player comparison data."
          onRetry={() => refetch()}
          variant="inline"
        />
      )}
      {isLoading && selectedIds.length >= 2 && (
        <TableSkeleton rows={12} columns={6} />
      )}
      {hasComparisonData && (
        <Section
          title="Side by side"
          description="Bold marks the best value in each row. Hover a stat for its definition."
        >
          <ComparisonTable
            players={comparisonData.players}
            positionType={selectedPositionType}
            statMode={statMode}
          />
        </Section>
      )}
      {hasComparisonData && selectedPositionType !== "goalie" && (
        <StatComparisonChart
          players={comparisonData.players.map((p) => ({
            name: p.name,
            stats: p.stats ?? null,
          }))}
          title="Stat comparison"
        />
      )}
      {hasComparisonData && selectedPositionType === "goalie" && (
        <GoalieComparison
          players={comparisonData.players.map((p) => ({
            name: p.name,
            stats: p.goalieStats ?? null,
          }))}
          title="Goalie comparison"
        />
      )}
      {hasComparisonData && selectedPositionType === "goalie" && (
        <GoalieDangerZoneComparison
          players={comparisonData.players.map((p) => ({
            name: p.name,
            stats: p.goalieStats ?? null,
          }))}
          leagueAverages={dangerLeagueAverages}
          title="Danger zone comparison"
        />
      )}
      {selectedIds.length >= 1 && selectedIds.length < 2 && (
        <EmptyState
          title="Add one more player"
          hint="A comparison needs at least two players."
        />
      )}
    </div>
  );
}
