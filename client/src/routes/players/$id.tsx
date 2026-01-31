import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Filter } from "lucide-react";
import { usePlayer, usePlayerStats, useTeams, usePageTitle } from "@/hooks";
import { ErrorState, BackButton } from "@/components/shared";
import {
  PlayerHeader,
  PlayerHeaderSkeleton,
  SkaterStatsTable,
  GoalieStatsTable,
  StatsTableSkeleton,
  PlayerShotMap,
  CareerTrajectory,
  RollingPerformance,
  GoalieWorkloadMonitor,
  GoalieDangerZoneRadar,
  GoalieReboundControl,
  ShiftQualityDashboard,
  ShiftQualityDashboardSkeleton,
  buildSkaterSeasonRows,
  calculateSkaterTotals,
  buildGoalieSeasonRows,
  calculateGoalieTotals,
} from "@/components/player-detail";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SkaterStats, GoalieStats } from "@/types";

export const Route = createFileRoute("/players/$id")({
  component: PlayerDetailPage,
});

// Type guard to check if stats response is for a goalie
function isGoalieStats(stats: SkaterStats[] | GoalieStats[]): stats is GoalieStats[] {
  if (stats.length === 0) return false;
  return "goalsAgainst" in stats[0];
}

// Situation options for the filter
const SITUATIONS = [
  { value: "all", label: "All Situations" },
  { value: "5on5", label: "5v5" },
  { value: "5on4", label: "5v4 (Power Play)" },
  { value: "4on5", label: "4v5 (Penalty Kill)" },
  { value: "other", label: "Other" },
] as const;

function PlayerDetailPage() {
  const { id } = Route.useParams();
  const playerId = parseInt(id, 10);
  const [situation, setSituation] = useState("all");

  const { data: player, isLoading: playerLoading, error, refetch } = usePlayer(playerId);
  const { data: statsData, isLoading: statsLoading } = usePlayerStats(playerId);
  const { data: teamsData } = useTeams();

  usePageTitle(player?.name);

  const isGoalie = player?.position === "G";

  // Get available situations from the data
  const availableSituations = useMemo(() => {
    const stats = statsData?.stats ?? [];
    const situations = new Set(stats.map((s: SkaterStats | GoalieStats) => s.situation));
    return SITUATIONS.filter((s) => situations.has(s.value));
  }, [statsData]);

  // Process stats based on player type
  const allStats = useMemo(() => statsData?.stats ?? [], [statsData?.stats]);

  const skaterSeasonRows = useMemo(() => {
    if (isGoalie || isGoalieStats(allStats)) return [];
    return buildSkaterSeasonRows(allStats as SkaterStats[], situation);
  }, [allStats, situation, isGoalie]);

  const skaterTotals = useMemo(() => calculateSkaterTotals(skaterSeasonRows), [skaterSeasonRows]);

  const goalieSeasonRows = useMemo(() => {
    if (!isGoalie && !isGoalieStats(allStats)) return [];
    return buildGoalieSeasonRows(allStats as GoalieStats[], situation);
  }, [allStats, situation, isGoalie]);

  const goalieTotals = useMemo(() => calculateGoalieTotals(goalieSeasonRows), [goalieSeasonRows]);

  // Filter goalie stats by situation for radar chart (non-playoffs only, matching table)
  const filteredGoalieStats = useMemo(() => {
    if (!isGoalie || !isGoalieStats(allStats)) return [];
    return (allStats as GoalieStats[]).filter(
      (s) => !s.isPlayoffs && (situation === "all" || s.situation === situation)
    );
  }, [allStats, situation, isGoalie]);

  const teams = teamsData?.teams;

  // Get available seasons from stats data for shot filter (skaters only)
  const availableSeasons = useMemo(() => {
    const seasons = new Set(allStats.map((s: SkaterStats | GoalieStats) => s.season));
    return Array.from(seasons).sort((a, b) => b - a);
  }, [allStats]);

  // Get current season "all" situation stats for shift quality dashboard (skaters only)
  const shiftQualityStats = useMemo(() => {
    if (isGoalie || isGoalieStats(allStats) || availableSeasons.length === 0) return null;
    const skaterStats = allStats as SkaterStats[];
    const currentSeason = availableSeasons[0];
    // Find "all" situation, non-playoff stats for current season
    const stats = skaterStats.find(
      (s) => s.season === currentSeason && s.situation === "all" && !s.isPlayoffs
    );
    // Only return if we have shift data
    if (stats?.shifts != null && stats?.oZoneShiftStarts != null) {
      return stats;
    }
    return null;
  }, [allStats, availableSeasons, isGoalie]);

  if (error) {
    return (
      <div className="container py-8">
        <ErrorState
          title="Player not found"
          message="Could not find this player. They may not exist or the server may be unavailable."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <BackButton fallbackPath="/players" label="Players" />

      {playerLoading ? (
        <PlayerHeaderSkeleton />
      ) : player ? (
        <PlayerHeader
          player={player}
          teams={teams}
          isGoalie={isGoalie}
          luckStats={!isGoalie && skaterTotals.xg > 0 ? {
            goals: skaterTotals.g,
            expectedGoals: skaterTotals.xg,
            shots: skaterTotals.shots,
          } : undefined}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-semibold">Career Statistics</h2>
        {availableSituations.length > 1 && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={situation} onValueChange={setSituation}>
              <SelectTrigger className="h-8 w-36 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableSituations.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {statsLoading ? (
        <StatsTableSkeleton />
      ) : isGoalie ? (
        <>
          <GoalieStatsTable rows={goalieSeasonRows} totals={goalieTotals} />
          {filteredGoalieStats.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <GoalieDangerZoneRadar stats={filteredGoalieStats} />
              <GoalieReboundControl stats={filteredGoalieStats} />
            </div>
          )}
          {availableSeasons.length > 0 && (
            <GoalieWorkloadMonitor playerId={playerId} season={availableSeasons[0]} />
          )}
        </>
      ) : (
        <SkaterStatsTable rows={skaterSeasonRows} totals={skaterTotals} />
      )}

      {!isGoalie && statsLoading && (
        <ShiftQualityDashboardSkeleton className="mt-6" />
      )}
      {!isGoalie && !statsLoading && shiftQualityStats && (
        <ShiftQualityDashboard stats={shiftQualityStats} className="mt-6" />
      )}

      {!isGoalie && !statsLoading && allStats.length > 0 && player && (
        <CareerTrajectory stats={allStats as SkaterStats[]} />
      )}

      {!isGoalie && availableSeasons.length > 0 && (
        <RollingPerformance playerId={playerId} season={availableSeasons[0]} />
      )}

      {!isGoalie && availableSeasons.length > 0 && (
        <PlayerShotMap playerId={playerId} availableSeasons={availableSeasons} playerTeamAbbreviation={player?.currentTeamAbbreviation} />
      )}
    </div>
  );
}
