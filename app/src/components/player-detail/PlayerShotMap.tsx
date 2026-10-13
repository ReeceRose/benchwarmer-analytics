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
import {
  filterShotsByDanger,
  summariseShots,
} from "@/components/shot-explorer/shot-utils";
import { cn } from "@/lib/utils";
import type { DangerLevel } from "@/types";
import { EmptyState } from "@/components/layout";

interface PlayerShotMapProps {
  playerId: number;
  availableSeasons: number[];
  playerTeamAbbreviation?: string;
  className?: string;
}

export function PlayerShotMap({
  playerId,
  availableSeasons,
  playerTeamAbbreviation,
  className,
}: PlayerShotMapProps) {
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
  const filteredShots = useMemo(
    () => filterShotsByDanger(shotsData?.shots ?? [], dangerLevel),
    [shotsData?.shots, dangerLevel],
  );
  const summary = useMemo(() => summariseShots(filteredShots), [filteredShots]);

  if (effectiveShotSeason === null) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle>Shot map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-75">
            <Skeleton className="aspect-100/85 w-full max-w-140 rounded-xl" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>Shot map</CardTitle>
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
          <Skeleton className="aspect-100/85 w-full max-w-140 rounded-xl" />
        ) : filteredShots.length > 0 ? (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <RinkVisualization shots={filteredShots} showLegend teamAbbreviation={playerTeamAbbreviation} />
              <div className="space-y-3">
                <ShotSummaryCard summary={summary} />
                <p className="text-xs text-muted-foreground">
                  Showing {filteredShots.length} shots
                  {dangerLevel !== "all" && ` (${dangerLevel} danger)`}
                  {shotLimit && shotsData && shotsData.shots.length >= shotLimit && `, limited to ${shotLimit}`}
                </p>
              </div>
            </div>
            <PeriodBreakdownCard shots={filteredShots} />
          </div>
        ) : (
          <EmptyState
            title={`No shots for ${effectiveShotSeason}–${String(effectiveShotSeason + 1).slice(2)}`}
            hint="Loosen the filters, or pick another season."
          />
        )}
      </CardContent>
    </Card>
  );
}
