import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RinkVisualization,
  PlayerShotFilters,
  ShotSummaryCard,
  PeriodBreakdownCard,
} from "@/components/shot-explorer";
import { usePlayerShots } from "@/hooks";
import type { DangerLevel } from "@/types";

interface PlayerShotMapProps {
  playerId: number;
  availableSeasons: number[];
}

export function PlayerShotMap({ playerId, availableSeasons }: PlayerShotMapProps) {
  const [shotSeason, setShotSeason] = useState<number | null>(null);
  const [shotPeriod, setShotPeriod] = useState<number | undefined>(undefined);
  const [shotType, setShotType] = useState<string | undefined>(undefined);
  const [goalsOnly, setGoalsOnly] = useState(false);
  const [shotLimit, setShotLimit] = useState<number | undefined>(250);
  const [dangerLevel, setDangerLevel] = useState<DangerLevel>("all");

  // Compute default season - use first available when shotSeason is null
  const effectiveShotSeason = shotSeason ?? availableSeasons[0] ?? null;

  // Only fetch shots when we have a valid season
  const { data: shotsData, isLoading: shotsLoading } = usePlayerShots(playerId, {
    season: effectiveShotSeason ?? undefined,
    period: shotPeriod,
    shotType,
    goalsOnly: goalsOnly || undefined,
    limit: shotLimit,
  });

  // Filter shots by danger level client-side
  const shots = shotsData?.shots;
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

  if (effectiveShotSeason === null) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Shot Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-75">
            <Skeleton className="h-75 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Shot Map</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <PlayerShotFilters
          season={effectiveShotSeason}
          onSeasonChange={setShotSeason}
          availableSeasons={availableSeasons}
          period={shotPeriod}
          onPeriodChange={setShotPeriod}
          shotType={shotType}
          onShotTypeChange={setShotType}
          goalsOnly={goalsOnly}
          onGoalsOnlyChange={setGoalsOnly}
          limit={shotLimit}
          onLimitChange={setShotLimit}
          dangerLevel={dangerLevel}
          onDangerLevelChange={setDangerLevel}
        />

        {shotsLoading ? (
          <Skeleton className="h-75 w-full" />
        ) : filteredShots.length > 0 ? (
          <div className="space-y-4">
            <RinkVisualization shots={filteredShots} showLegend />
            {shotsData?.summary && <ShotSummaryCard summary={shotsData.summary} />}
            <PeriodBreakdownCard shots={filteredShots} />
            <p className="text-sm text-muted-foreground text-center">
              Showing {filteredShots.length} shots
              {dangerLevel !== "all" && ` (${dangerLevel} danger)`}
              {shotLimit && shotsData && shotsData.shots.length >= shotLimit && ` - limited to ${shotLimit}`}
            </p>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No shot data available for {effectiveShotSeason}-{effectiveShotSeason + 1}.</p>
            <p className="text-sm mt-1">Try adjusting your filters or selecting a different season.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
