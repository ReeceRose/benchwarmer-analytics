import { useMemo, useState } from "react";
import { Grid3X3, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SegmentedControl } from "@/components/layout";
import { SeasonSelector } from "@/components/shared/SeasonSelector";
import { ErrorState } from "@/components/shared/ErrorState";
import { RinkVisualization } from "@/components/shot-explorer/RinkVisualization";
import { ShotHeatMap } from "@/components/shot-explorer/ShotHeatMap";
import { ShotFilters } from "@/components/shot-explorer/ShotFilters";
import { ShotSummaryCard } from "@/components/shot-explorer/ShotSummaryCard";
import { useTeamShots, useTeamSeasons, useTeamRoster } from "@/hooks";
import { MONEYPUCK_DANGER_THRESHOLDS } from "@/lib/danger-zones";
import type { DangerLevel, ScoreState } from "@/types";

type ViewMode = "shots" | "heatmap";

const VIEW_OPTIONS = [
  {
    value: "shots",
    label: (
      <span className="flex items-center gap-1.5">
        <Circle className="size-3.5" />
        Shots
      </span>
    ),
  },
  {
    value: "heatmap",
    label: (
      <span className="flex items-center gap-1.5">
        <Grid3X3 className="size-3.5" />
        Heat map
      </span>
    ),
  },
] as const;

interface ShotExplorerProps {
  teamAbbrev: string;
  season?: number;
  onSeasonChange: (season: number | undefined) => void;
  period?: number;
  onPeriodChange: (period: number | undefined) => void;
  shotType?: string;
  onShotTypeChange: (type: string | undefined) => void;
  playerId?: number;
  onPlayerIdChange: (id: number | undefined) => void;
  goalsOnly: boolean;
  onGoalsOnlyChange: (goalsOnly: boolean) => void;
  limit?: number;
  onLimitChange: (limit: number | undefined) => void;
  dangerLevel: DangerLevel;
  onDangerLevelChange: (level: DangerLevel) => void;
  scoreState: ScoreState;
  onScoreStateChange: (state: ScoreState) => void;
}

export function ShotExplorer({
  teamAbbrev,
  season,
  onSeasonChange,
  period,
  onPeriodChange,
  shotType,
  onShotTypeChange,
  playerId,
  onPlayerIdChange,
  goalsOnly,
  onGoalsOnlyChange,
  limit,
  onLimitChange,
  dangerLevel,
  onDangerLevelChange,
  scoreState,
  onScoreStateChange,
}: ShotExplorerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("shots");
  const { data: seasonsData } = useTeamSeasons(teamAbbrev);

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useTeamShots(teamAbbrev, {
    season: season ?? 0,
    period,
    shotType,
    playerId,
    goalsOnly,
    scoreState: scoreState === "all" ? undefined : scoreState,
    limit,
  });

  const { data: rosterData } = useTeamRoster(teamAbbrev, season);

  // Filter shots by danger level client-side (we already have xG data)
  const shots = data?.shots;
  const filteredShots = useMemo(() => {
    if (!shots) return [];

    return shots.filter((shot) => {
      const xg = shot.xGoal ?? 0;
      switch (dangerLevel) {
        case "high":
          return xg >= MONEYPUCK_DANGER_THRESHOLDS.high;
        case "medium-high":
          return xg >= MONEYPUCK_DANGER_THRESHOLDS.medium;
        case "low":
          return xg < MONEYPUCK_DANGER_THRESHOLDS.medium;
        default:
          return true;
      }
    });
  }, [shots, dangerLevel]);

  // Set initial season if not set
  if (!season && seasonsData?.seasons.length) {
    onSeasonChange(seasonsData.seasons[0].year);
  }

  if (!season) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Shot map</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Select a season to view shot data.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <CardTitle className="whitespace-nowrap">Shot map</CardTitle>
            <SegmentedControl
              aria-label="Shot map view"
              value={viewMode}
              onValueChange={setViewMode}
              options={VIEW_OPTIONS}
            />
          </div>
          <SeasonSelector
            value={season}
            onValueChange={onSeasonChange}
            teamAbbrev={teamAbbrev}
          />
        </CardHeader>
        <CardContent className="space-y-6">
          <ShotFilters
            period={period}
            onPeriodChange={onPeriodChange}
            shotType={shotType}
            onShotTypeChange={onShotTypeChange}
            playerId={playerId}
            onPlayerIdChange={onPlayerIdChange}
            goalsOnly={goalsOnly}
            onGoalsOnlyChange={onGoalsOnlyChange}
            players={rosterData?.players}
            limit={limit}
            onLimitChange={onLimitChange}
            dangerLevel={dangerLevel}
            onDangerLevelChange={onDangerLevelChange}
            scoreState={scoreState}
            onScoreStateChange={onScoreStateChange}
          />
          {error && (
            <ErrorState
              title="Failed to load shot data"
              message={error instanceof Error ? error.message : "Unknown error"}
              onRetry={refetch}
            />
          )}
          {isLoading && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <Skeleton className="aspect-100/85 w-full max-w-140 rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          )}
          {!isLoading && !error && data && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
              {viewMode === "shots" ? (
                <RinkVisualization
                  shots={filteredShots}
                  showLegend
                  teamAbbreviation={teamAbbrev}
                />
              ) : (
                <ShotHeatMap
                  shots={filteredShots}
                  mode="xg"
                />
              )}
              <div className="space-y-3">
                <ShotSummaryCard summary={data.summary} />
                <p className="text-xs text-muted-foreground">
                  Showing {filteredShots.length} shots
                  {dangerLevel !== "all" && ` (${dangerLevel} danger)`}
                  {limit && data.shots.length >= limit && `, limited to ${limit}`}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
