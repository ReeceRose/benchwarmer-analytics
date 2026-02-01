import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { GitCompare, Filter } from "lucide-react";
import {
  usePlayerComparison,
  useSeasons,
  usePlayers,
  usePageTitle,
  useGoalieLeagueBaselines,
} from "@/hooks";
import { getCurrentSeason } from "@/lib/date-utils";
import { getDangerZoneLeagueAveragesFromGoalieBaselines } from "@/lib/goalie-baselines";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BackButton, SeasonSelector, ErrorState } from "@/components/shared";
import { RadarComparison, GoalieComparison, GoalieDangerZoneComparison } from "@/components/charts";
import {
  SelectedPlayersCard,
  ComparisonTable,
  ComparisonLegend,
  type StatMode,
} from "@/components/compare";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Player, Situation } from "@/types";

const searchSchema = z.object({
  ids: z.string().optional(),
  season: z.number().optional(),
  situation: z.string().optional(),
});

export const Route = createFileRoute("/compare")({
  component: ComparePage,
  validateSearch: searchSchema,
});

const SITUATIONS = [
  { value: "all", label: "All Situations" },
  { value: "5on5", label: "5v5" },
  { value: "5on4", label: "5v4 (Power Play)" },
  { value: "4on5", label: "4v5 (Penalty Kill)" },
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
    <div className="container py-8">
      <BackButton />

      <div className="mb-6 mt-4">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Compare Players
        </h1>
        <p className="text-muted-foreground">
          Compare up to 5 players side-by-side with detailed stats.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <SeasonSelector
          value={season}
          onValueChange={(s) => updateSearch({ season: s })}
        />
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={situation}
            onValueChange={(s) => updateSearch({ situation: s as Situation })}
          >
            <SelectTrigger className="w-40">
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
        </div>
        <Tabs
          value={statMode}
          onValueChange={(v) => setStatMode(v as StatMode)}
        >
          <TabsList className="h-9">
            <TabsTrigger value="all" className="text-xs px-3">
              All
            </TabsTrigger>
            <TabsTrigger value="counting" className="text-xs px-3">
              Counting
            </TabsTrigger>
            <TabsTrigger value="rate" className="text-xs px-3">
              Rate
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
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
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      )}
      {hasComparisonData && (
        <ComparisonTable
          players={comparisonData.players}
          positionType={selectedPositionType}
          statMode={statMode}
        />
      )}
      {hasComparisonData && <ComparisonLegend />}
      {hasComparisonData && selectedPositionType !== "goalie" && (
        <RadarComparison
          players={comparisonData.players.map((p) => ({
            name: p.name,
            stats: p.stats ?? null,
          }))}
          title="Stat Comparison"
          className="mt-6"
        />
      )}
      {hasComparisonData && selectedPositionType === "goalie" && (
        <GoalieComparison
          players={comparisonData.players.map((p) => ({
            name: p.name,
            stats: p.goalieStats ?? null,
          }))}
          title="Goalie Comparison"
          className="mt-6"
        />
      )}
      {hasComparisonData && selectedPositionType === "goalie" && (
        <GoalieDangerZoneComparison
          players={comparisonData.players.map((p) => ({
            name: p.name,
            stats: p.goalieStats ?? null,
          }))}
          leagueAverages={dangerLeagueAverages}
          title="Danger Zone Comparison"
          className="mt-6"
        />
      )}
      {selectedIds.length >= 1 && selectedIds.length < 2 && (
        <Card>
          <CardContent className="py-12 text-center">
            <GitCompare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="font-medium">Add one more player</p>
            <p className="text-sm text-muted-foreground mt-1">
              You need at least 2 players to compare.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
