import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, Panel, SegmentedControl } from "@/components/layout";
import { ErrorState } from "@/components/shared/ErrorState";
import { RinkVisualization } from "@/components/shot-explorer/RinkVisualization";
import { ShotHeatMap } from "@/components/shot-explorer/ShotHeatMap";
import { ShotFilters } from "@/components/shot-explorer/ShotFilters";
import {
  ShotSummaryCard,
  ShotSummaryCardSkeleton,
} from "@/components/shot-explorer/ShotSummaryCard";
import { TopShooters } from "@/components/shot-explorer/TopShooters";
import {
  DANGER_LEVEL_OPTIONS,
  filterShotsByDanger,
  summariseShots,
} from "@/components/shot-explorer/shot-utils";
import { useTeamShots, useTeamRoster } from "@/hooks";
import type { DangerLevel, ScoreState } from "@/types";

type ViewMode = "shots" | "heatmap";

const GRID = "grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(18rem,2fr)]";

interface ShotExplorerProps {
  teamAbbrev: string;
  season: number;
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
  onClearFilters: () => void;
}

export function ShotExplorer({
  teamAbbrev,
  season,
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
  onClearFilters,
}: ShotExplorerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("shots");

  const { data, isLoading, error, refetch } = useTeamShots(teamAbbrev, {
    season,
    period,
    shotType,
    playerId,
    goalsOnly,
    scoreState: scoreState === "all" ? undefined : scoreState,
    limit,
  });

  const { data: rosterData } = useTeamRoster(teamAbbrev, season);

  const filteredShots = useMemo(
    () => filterShotsByDanger(data?.shots ?? [], dangerLevel),
    [data?.shots, dangerLevel],
  );
  const summary = useMemo(() => summariseShots(filteredShots), [filteredShots]);

  const dangerLabel = DANGER_LEVEL_OPTIONS.find((d) => d.value === dangerLevel)?.label;
  const limited = limit !== undefined && (data?.shots.length ?? 0) >= limit;

  return (
    <div className="space-y-4">
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
        onClear={onClearFilters}
      />

      {error ? (
        <ErrorState
          title="Failed to load shot data"
          message={error instanceof Error ? error.message : "Unknown error"}
          onRetry={refetch}
        />
      ) : isLoading || !data ? (
        <div className={GRID}>
          <Skeleton className="aspect-100/90 w-full rounded-2xl" />
          <div className="space-y-4">
            <ShotSummaryCardSkeleton />
            <Skeleton className="h-72 rounded-2xl" />
          </div>
        </div>
      ) : filteredShots.length === 0 ? (
        <EmptyState
          title="No shots match these filters"
          hint="Loosen the filters, or pick another season."
        />
      ) : (
        <div className={GRID}>
          <Panel className="h-fit space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">
                  {viewMode === "shots" ? "Shot map" : "Heat map"}
                </h3>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {filteredShots.length} unblocked shot attempts
                  {dangerLevel !== "all" && ` · ${dangerLabel}`}
                  {limited && ` · first ${limit} of the season`}
                </p>
              </div>
              <SegmentedControl
                aria-label="Shot map view"
                value={viewMode}
                onValueChange={setViewMode}
                options={[
                  { value: "shots", label: "Shots" },
                  { value: "heatmap", label: "Heat map" },
                ]}
              />
            </div>
            {viewMode === "shots" ? (
              <RinkVisualization
                shots={filteredShots}
                showLegend
                teamAbbreviation={teamAbbrev}
                className="max-w-none"
              />
            ) : (
              <ShotHeatMap shots={filteredShots} mode="xg" className="max-w-none" />
            )}
          </Panel>
          <div className="space-y-4">
            <ShotSummaryCard summary={summary} />
            {playerId === undefined && (
              <TopShooters
                shots={filteredShots}
                teamAbbrev={teamAbbrev}
                onSelect={onPlayerIdChange}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
