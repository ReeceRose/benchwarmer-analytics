import { useMemo, useState } from "react";
import { Grid3X3, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { SeasonSelector } from "@/components/shared/SeasonSelector";
import { ErrorState } from "@/components/shared/ErrorState";
import { RinkVisualization } from "@/components/shot-explorer/RinkVisualization";
import { ShotHeatMap } from "@/components/shot-explorer/ShotHeatMap";
import { ShotFilters } from "@/components/shot-explorer/ShotFilters";
import { ShotSummaryCard } from "@/components/shot-explorer/ShotSummaryCard";
import { useTeamShots, useTeamSeasons, useTeamRoster } from "@/hooks";
import type { DangerLevel, ScoreState } from "@/types";

type ViewMode = "shots" | "heatmap";

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
          return xg > 0.15;
        case "medium-high":
          return xg >= 0.06;
        case "low":
          return xg < 0.06;
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
          <CardTitle>Shot Map</CardTitle>
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
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-4">
            <CardTitle>Shot Map</CardTitle>
            <div className="flex items-center rounded-md border p-1">
              <Button
                variant={viewMode === "shots" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode("shots")}
              >
                <Circle className="h-3.5 w-3.5 mr-1" />
                Shots
              </Button>
              <Button
                variant={viewMode === "heatmap" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode("heatmap")}
              >
                <Grid3X3 className="h-3.5 w-3.5 mr-1" />
                Heat Map
              </Button>
            </div>
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
            <div className="space-y-4">
              <Skeleton className="h-100 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          )}
          {!isLoading && !error && data && (
            <>
              {viewMode === "shots" ? (
                <RinkVisualization
                  shots={filteredShots}
                  showLegend
                />
              ) : (
                <ShotHeatMap
                  shots={filteredShots}
                  mode="xg"
                />
              )}
              <ShotSummaryCard summary={data.summary} />
              <p className="text-sm text-muted-foreground text-center">
                Showing {filteredShots.length} shots
                {dangerLevel !== "all" && ` (${dangerLevel} danger)`}
                {limit && data.shots.length >= limit && ` - limited to ${limit}`}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
