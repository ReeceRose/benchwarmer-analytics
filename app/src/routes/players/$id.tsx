import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  usePlayer,
  usePlayerStats,
  usePageTitle,
  useGoalieLeagueBaselines,
  useSkaterLeagueBaselines,
} from "@/hooks";
import { ErrorState } from "@/components/shared";
import {
  EntityHeroSkeleton,
  PageTabs,
  Section,
  pageTabClass,
} from "@/components/layout";
import { getDangerZoneLeagueAveragesFromGoalieBaselines } from "@/lib/goalie-baselines";
import {
  PlayerHero,
  SkaterStatsTable,
  GoalieStatsTable,
  StatsTableSkeleton,
  PlayerShotMap,
  CareerTrajectory,
  CareerTotalsChart,
  RollingPerformance,
  SkaterPercentilePanel,
  SeasonComparisonRadar,
  SituationBreakdownChart,
  GoalieWorkloadMonitor,
  GoalieDangerZones,
  GoalieReboundControl,
  ShiftQualityDashboard,
  FaceoffStatsCard,
  GiveawayTakeawayCard,
  UsageCardSkeleton,
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

const TABS = ["overview", "career", "shots", "form"] as const;
type PlayerTab = (typeof TABS)[number];

const TAB_LABELS: Record<PlayerTab, string> = {
  overview: "Overview",
  career: "Career stats",
  shots: "Shot map",
  form: "Recent form",
};

export const Route = createFileRoute("/players/$id")({
  component: PlayerDetailPage,
  // `season` is accepted (box score links send it) but the page always opens
  // on the player's latest season.
  validateSearch: (
    search: Record<string, unknown>,
  ): { tab?: PlayerTab; season?: number } => ({
    tab: TABS.includes(search.tab as PlayerTab)
      ? (search.tab as PlayerTab)
      : undefined,
    season: typeof search.season === "number" ? search.season : undefined,
  }),
});

// Type guard to check if stats response is for a goalie
function isGoalieStats(stats: SkaterStats[] | GoalieStats[]): stats is GoalieStats[] {
  if (stats.length === 0) return false;
  return "goalsAgainst" in stats[0];
}

// Situation options for the filter
const SITUATIONS = [
  { value: "all", label: "All situations" },
  { value: "5on5", label: "5v5" },
  { value: "5on4", label: "5v4 (power play)" },
  { value: "4on5", label: "4v5 (penalty kill)" },
  { value: "other", label: "Other" },
] as const;

function PlayerDetailPage() {
  const { id } = Route.useParams();
  const { tab = "overview" } = Route.useSearch();
  const playerId = parseInt(id, 10);
  const [situation, setSituation] = useState("all");

  const { data: player, isLoading: playerLoading, error, refetch } = usePlayer(playerId);
  const { data: statsData, isLoading: statsLoading } = usePlayerStats(playerId);

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
      (s) => !s.isPlayoffs && s.situation === situation
    );
  }, [allStats, situation, isGoalie]);

  const baselineSeasons = useMemo(() => {
    const seasons = new Set(filteredGoalieStats.map((s) => s.season));
    return Array.from(seasons).sort((a, b) => a - b);
  }, [filteredGoalieStats]);

  const { data: goalieBaselines } = useGoalieLeagueBaselines(
    baselineSeasons,
    situation,
    false
  );

  const dangerLeagueAverages = useMemo(() => {
    return getDangerZoneLeagueAveragesFromGoalieBaselines(goalieBaselines);
  }, [goalieBaselines]);

  // Skater baselines (for faceoff stats)
  const skaterBaselineSeasons = useMemo(() => {
    if (isGoalie || isGoalieStats(allStats)) return [];
    const seasons = new Set((allStats as SkaterStats[]).filter(s => !s.isPlayoffs).map((s) => s.season));
    return Array.from(seasons).sort((a, b) => a - b);
  }, [allStats, isGoalie]);

  const { data: skaterBaselines } = useSkaterLeagueBaselines(
    skaterBaselineSeasons,
    "all", // Faceoffs are typically reported for all situations
    false
  );


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

  // Latest regular-season, all-situations row: the hero's headline numbers.
  const latestSeasonStats = useMemo(() => {
    const regular = (allStats as (SkaterStats | GoalieStats)[]).filter(
      (s) => s.situation === "all" && !s.isPlayoffs,
    );
    return regular.sort((a, b) => b.season - a.season)[0];
  }, [allStats]);

  // Goalies have no shot map or rolling form views.
  const tabs: readonly PlayerTab[] = isGoalie ? ["overview", "career"] : TABS;
  const activeTab: PlayerTab = tabs.includes(tab) ? tab : "overview";

  if (error) {
    return (
      <div className="container py-8">
        <ErrorState
          title="Player not found"
          message="This player doesn't exist, or the stats service is unavailable."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const situationFilter = availableSituations.length > 1 && (
    <Select value={situation} onValueChange={setSituation}>
      <SelectTrigger className="w-40" aria-label="Situation">
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
  );

  const currentSeason = availableSeasons[0];

  return (
    <>
      {playerLoading || !player ? (
        <EntityHeroSkeleton />
      ) : (
        <PlayerHero player={player} season={latestSeasonStats} />
      )}

      <PageTabs aria-label="Player sections">
        {tabs.map((t) => (
          <Link
            key={t}
            to="/players/$id"
            params={{ id }}
            search={t === "overview" ? {} : { tab: t }}
            data-active={t === activeTab}
            activeProps={{}}
            className={pageTabClass}
            resetScroll={false}
          >
            {TAB_LABELS[t]}
          </Link>
        ))}
      </PageTabs>

      <div className="container space-y-10 py-8">
        {statsLoading ? (
          activeTab === "career" ? (
            <StatsTableSkeleton />
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <UsageCardSkeleton />
              <UsageCardSkeleton />
              <UsageCardSkeleton />
            </div>
          )
        ) : allStats.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            No NHL stats recorded for this player yet.
          </p>
        ) : isGoalie ? (
          <>
            {activeTab === "overview" && (
              <>
                {currentSeason && (
                  <Section title="Workload">
                    <GoalieWorkloadMonitor
                      playerId={playerId}
                      season={currentSeason}
                      className="mt-0"
                    />
                  </Section>
                )}
                {filteredGoalieStats.length > 0 && (
                  <Section
                    title="Goaltending profile"
                    description="Save rates by shot danger and rebound control, across the seasons shown in career stats."
                    action={situationFilter}
                  >
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                      <GoalieDangerZones
                        stats={filteredGoalieStats}
                        leagueAverages={dangerLeagueAverages}
                      />
                      <GoalieReboundControl
                        stats={filteredGoalieStats}
                        leagueAverageRatio={goalieBaselines?.reboundRatio}
                      />
                    </div>
                  </Section>
                )}
              </>
            )}
            {activeTab === "career" && (
              <Section title="Career statistics" action={situationFilter}>
                <GoalieStatsTable rows={goalieSeasonRows} totals={goalieTotals} />
              </Section>
            )}
          </>
        ) : (
          <>
            {activeTab === "overview" && currentSeason && (
              <>
                <Section
                  title="This season"
                  description="Regular season, all situations unless noted."
                >
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <SkaterPercentilePanel
                      stats={allStats as SkaterStats[]}
                      season={currentSeason}
                    />
                    <SeasonComparisonRadar
                      stats={allStats as SkaterStats[]}
                      season={currentSeason}
                    />
                  </div>
                </Section>
                {shiftQualityStats && (
                  <Section title="Usage and puck play">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                      <ShiftQualityDashboard stats={shiftQualityStats} />
                      <FaceoffStatsCard
                        stats={shiftQualityStats}
                        baselines={skaterBaselines}
                      />
                      <GiveawayTakeawayCard stats={shiftQualityStats} />
                    </div>
                  </Section>
                )}
                <Section title="By situation">
                  <SituationBreakdownChart
                    stats={allStats as SkaterStats[]}
                    season={currentSeason}
                  />
                </Section>
              </>
            )}
            {activeTab === "career" && (
              <>
                <Section title="Career statistics" action={situationFilter}>
                  <SkaterStatsTable rows={skaterSeasonRows} totals={skaterTotals} />
                </Section>
                <Section title="Career trends">
                  <CareerTrajectory
                    stats={allStats as SkaterStats[]}
                    className="mt-0"
                  />
                  <CareerTotalsChart
                    stats={allStats as SkaterStats[]}
                    className="mt-0"
                  />
                </Section>
              </>
            )}
            {activeTab === "shots" && (
              <PlayerShotMap
                playerId={playerId}
                availableSeasons={availableSeasons}
                playerTeamAbbreviation={player?.currentTeamAbbreviation}
                className="mt-0"
              />
            )}
            {activeTab === "form" && currentSeason && (
              <RollingPerformance
                playerId={playerId}
                season={currentSeason}
                className="mt-0"
              />
            )}
          </>
        )}
      </div>
    </>
  );
}
