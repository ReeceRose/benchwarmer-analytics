import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { seasonsQueryOptions } from "@/hooks/useSeasons";
import * as z from "zod/mini";
import {
  useSpecialTeamsTeamRankings,
  useSpecialTeamsPlayerLeaders,
  usePlayerPenaltyStats,
  useSeasons,
  usePageTitle,
  usePenaltiesByVenue,
} from "@/hooks";
import { rankingsForVenue } from "@/lib/venue-penalties";
import { getCurrentSeason } from "@/lib/date-utils";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, SeasonSelector, TableSkeleton } from "@/components/shared";
import { PageHeader, SegmentedControl, ViewToggle } from "@/components/layout";
import {
  TeamRankingsTable,
  PlayerLeadersTable,
  PenaltyStatsTable,
  TeamSpecialTeamsBars,
  PPvsPKScatter,
  PlayerLeadersBars,
  PenaltyDiffScatter,
  TeamPenaltiesTable,
  TeamPenaltyBars,
  TeamPenaltyScatter,
  PenaltySeasonHeatmap,
  ArenaPenaltiesCard,
  HEATMAP_STATS,
} from "@/components/special-teams-stats";

const searchSchema = z.object({
  tab: z.optional(z.enum(["teams", "players"])),
  teamView: z.optional(z.enum(["units", "penalties"])),
  venue: z.optional(z.enum(["all", "home", "away"])),
  stat: z.optional(z.enum(HEATMAP_STATS)),
  order: z.optional(z.enum(["fewest", "most"])),
  layout: z.optional(z.enum(["all", "teams", "heatmap"])),
  plot: z.optional(z.enum(["value", "rank"])),
  teams: z.optional(z.string()),
  arenaMetric: z.optional(z.enum(["calls", "visitors"])),
  arenaRange: z.optional(z.enum(["season", "three", "all"])),
  from: z.optional(z.number()),
  to: z.optional(z.number()),
  sortSeason: z.optional(z.number()),
  season: z.optional(z.number()),
  view: z.optional(z.enum(["charts", "table"])),
  subTab: z.optional(z.enum(["pp", "pk", "penalties"])),
  penaltyScope: z.optional(z.enum(["best", "worst", "both"])),
  minToi: z.optional(z.number()),
  position: z.optional(z.enum(["F", "D"])),
  team: z.optional(z.string()),
});

export const Route = createFileRoute("/special-teams")({
  component: SpecialTeamsPage,
  loader: ({ context }) =>
    context.queryClient.prefetchQuery(seasonsQueryOptions),
  validateSearch: searchSchema,
});

function SpecialTeamsPage() {
  usePageTitle("Special Teams");

  const defaultSeason = getCurrentSeason();
  const { data: seasonsData } = useSeasons();
  const apiCurrentSeason = seasonsData?.seasons?.[0]?.year;

  const navigate = useNavigate({ from: Route.fullPath });
  const {
    tab: urlTab,
    teamView: urlTeamView,
    venue: urlVenue,
    stat,
    order,
    layout,
    plot,
    teams: highlightedTeams,
    arenaMetric,
    arenaRange,
    from,
    to,
    sortSeason,
    season,
    view: urlView,
    subTab: urlSubTab,
    penaltyScope: urlPenaltyScope,
    minToi: urlMinToi,
    position: urlPosition,
    team: urlTeam,
  } = Route.useSearch();

  const effectiveSeason = season ?? apiCurrentSeason ?? defaultSeason;
  const currentTab = urlTab ?? "teams";
  const teamView = urlTeamView ?? "units";
  const venue = urlVenue ?? "all";
  const currentView = urlView ?? "table";
  const currentSubTab = urlSubTab ?? "pp";
  const penaltyScope = urlPenaltyScope ?? "both";
  const minToi = urlMinToi ?? 50;
  const position = urlPosition;
  const team = urlTeam;

  const updateSearch = (updates: Partial<z.infer<typeof searchSchema>>) => {
    navigate({ search: (prev) => ({ ...prev, ...updates }), resetScroll: false });
  };

  // Team rankings data
  const {
    data: teamRankingsData,
    isLoading: teamRankingsLoading,
    error: teamRankingsError,
    refetch: refetchTeamRankings,
  } = useSpecialTeamsTeamRankings(effectiveSeason, false);

  // Home and road penalty totals for every season: the venue filter and the
  // season-by-season heatmap.
  const showPenalties = currentTab === "teams" && teamView === "penalties";
  const { data: venueData, isLoading: venueLoading } = usePenaltiesByVenue(
    showPenalties && (venue !== "all" || (urlView ?? "table") === "charts"),
  );
  const penaltyTeams = rankingsForVenue(
    teamRankingsData?.teams ?? [],
    venueData?.seasons.find((s) => s.season === effectiveSeason)?.teams,
    venue,
  );

  // Player leaders data (for PP or PK)
  const situation = currentSubTab === "pk" ? "4on5" : "5on4";
  const {
    data: playerLeadersData,
    isLoading: playerLeadersLoading,
    error: playerLeadersError,
  } = useSpecialTeamsPlayerLeaders(
    situation,
    effectiveSeason,
    false,
    {
      minToi,
      position,
      team,
      limit: 100,
    }
  );

  // Penalty stats data
  const {
    data: penaltyStatsData,
    isLoading: penaltyStatsLoading,
    error: penaltyStatsError,
    refetch: refetchPenaltyStats,
  } = usePlayerPenaltyStats(
    effectiveSeason,
    false,
    {
      minToi: minToi * 2, // Higher threshold for penalty stats
      position,
      team,
      limit: 100,
      sortBy: "netPer60",
      sortDir: "desc",
    },
    currentTab === "players" && currentSubTab === "penalties" && penaltyScope === "best",
  );

  const {
    data: penaltyStatsWorstData,
    isLoading: penaltyStatsWorstLoading,
    error: penaltyStatsWorstError,
    refetch: refetchPenaltyStatsWorst,
  } = usePlayerPenaltyStats(
    effectiveSeason,
    false,
    {
      minToi: minToi * 2, // Higher threshold for penalty stats
      position,
      team,
      limit: 100,
      sortBy: "netPer60",
      sortDir: "asc",
    },
    currentTab === "players" && currentSubTab === "penalties" && penaltyScope === "worst",
  );

  const EXTREME_LIMIT = 50;
  const {
    data: penaltyStatsBestExtremeData,
    isLoading: penaltyStatsBestExtremeLoading,
    error: penaltyStatsBestExtremeError,
    refetch: refetchPenaltyStatsBestExtreme,
  } = usePlayerPenaltyStats(
    effectiveSeason,
    false,
    {
      minToi: minToi * 2,
      position,
      team,
      limit: EXTREME_LIMIT,
      sortBy: "netPer60",
      sortDir: "desc",
    },
    currentTab === "players" && currentSubTab === "penalties" && penaltyScope === "both",
  );

  const {
    data: penaltyStatsWorstExtremeData,
    isLoading: penaltyStatsWorstExtremeLoading,
    error: penaltyStatsWorstExtremeError,
    refetch: refetchPenaltyStatsWorstExtreme,
  } = usePlayerPenaltyStats(
    effectiveSeason,
    false,
    {
      minToi: minToi * 2,
      position,
      team,
      limit: EXTREME_LIMIT,
      sortBy: "netPer60",
      sortDir: "asc",
    },
    currentTab === "players" && currentSubTab === "penalties" && penaltyScope === "both",
  );

  const penaltyPlayers =
    penaltyScope === "best"
      ? penaltyStatsData?.players ?? []
      : penaltyScope === "worst"
        ? penaltyStatsWorstData?.players ?? []
        : (() => {
            const best = penaltyStatsBestExtremeData?.players ?? [];
            const worst = penaltyStatsWorstExtremeData?.players ?? [];
            const seen = new Set<string>();
            const combined = [...best, ...worst].filter((p) => {
              const key = `${p.playerId}|${p.team}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            return combined;
          })();

  const penaltyScopeLabel =
    penaltyScope === "best"
      ? "best 100 by net per 60"
      : penaltyScope === "worst"
        ? "worst 100 by net per 60"
        : `best ${EXTREME_LIMIT} and worst ${EXTREME_LIMIT} by net per 60`;

  const penaltyScopeLoading =
    penaltyScope === "best"
      ? penaltyStatsLoading
      : penaltyScope === "worst"
        ? penaltyStatsWorstLoading
        : penaltyStatsBestExtremeLoading || penaltyStatsWorstExtremeLoading;

  const penaltyScopeError =
    penaltyScope === "best"
      ? penaltyStatsError
      : penaltyScope === "worst"
        ? penaltyStatsWorstError
        : penaltyStatsBestExtremeError || penaltyStatsWorstExtremeError;

  const refetchPenaltyScope = () => {
    if (penaltyScope === "best") return refetchPenaltyStats();
    if (penaltyScope === "worst") return refetchPenaltyStatsWorst();
    refetchPenaltyStatsBestExtreme();
    refetchPenaltyStatsWorstExtreme();
  };

  const isLoading =
    currentTab === "teams"
      ? teamRankingsLoading || (showPenalties && venue !== "all" && venueLoading)
      : currentSubTab === "penalties"
        ? penaltyScopeLoading
        : playerLeadersLoading;

  const hasError =
    currentTab === "teams"
      ? teamRankingsError
      : currentSubTab === "penalties"
        ? penaltyScopeError
        : playerLeadersError;

  return (
    <div className="container space-y-6 py-8">
      <PageHeader
        title="Special teams"
        description="Power play and penalty kill across the league, for teams and the players on those units."
        actions={
          <SeasonSelector
            value={effectiveSeason}
            onValueChange={(v) => v != null && updateSearch({ season: v })}
          />
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            aria-label="Teams or players"
            value={currentTab}
            onValueChange={(tab) => updateSearch({ tab })}
            options={[
              { value: "teams", label: "Teams" },
              { value: "players", label: "Players" },
            ]}
          />
          {currentTab === "teams" && (
            <SegmentedControl
              aria-label="Team stats"
              value={teamView}
              onValueChange={(teamView) => updateSearch({ teamView })}
              options={[
                { value: "units", label: "PP & PK" },
                { value: "penalties", label: "Penalties" },
              ]}
            />
          )}
          {showPenalties && (
            <SegmentedControl
              aria-label="Games"
              value={venue}
              onValueChange={(v) => updateSearch({ venue: v === "all" ? undefined : v })}
              options={[
                { value: "all", label: "All games" },
                { value: "home", label: "Home" },
                { value: "away", label: "Road" },
              ]}
            />
          )}
          {currentTab === "players" && (
            <SegmentedControl
              aria-label="Player stats"
              value={currentSubTab}
              onValueChange={(subTab) => updateSearch({ subTab })}
              options={[
                { value: "pp", label: "Power play" },
                { value: "pk", label: "Penalty kill" },
                { value: "penalties", label: "Penalties" },
              ]}
            />
          )}
        </div>
        <ViewToggle
          value={currentView}
          onValueChange={(view) => updateSearch({ view })}
        />
      </div>

      {currentTab === "players" && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
          {currentSubTab === "penalties" && (
            <label className="flex items-center gap-2 text-muted-foreground">
              Show
              <SegmentedControl
                aria-label="Penalty scope"
                value={penaltyScope}
                onValueChange={(penaltyScope) => updateSearch({ penaltyScope })}
                options={[
                  { value: "best", label: "Best" },
                  { value: "both", label: "Both" },
                  { value: "worst", label: "Worst" },
                ]}
              />
            </label>
          )}
          <label className="flex items-center gap-2 text-muted-foreground">
            Position
            <SegmentedControl
              aria-label="Position"
              value={position ?? "all"}
              onValueChange={(v) =>
                updateSearch({ position: v === "all" ? undefined : v })
              }
              options={[
                { value: "all", label: "All" },
                { value: "F", label: "Forwards" },
                { value: "D", label: "Defense" },
              ]}
            />
          </label>
          <label className="flex items-center gap-2 text-muted-foreground">
            Minimum minutes
            <Input
              type="number"
              value={minToi}
              onChange={(e) =>
                updateSearch({ minToi: Number(e.target.value) || 50 })
              }
              className="h-9 w-20"
              min={0}
              max={500}
            />
          </label>
        </div>
      )}

      {isLoading ? (
        currentView === "charts" ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-256 rounded-2xl" />
            <Skeleton className="h-256 rounded-2xl" />
          </div>
        ) : (
          <TableSkeleton rows={10} columns={10} />
        )
      ) : hasError ? (
        <ErrorState
          title="Couldn't load special teams"
          message="The special teams request failed."
          onRetry={
            currentTab === "teams"
              ? refetchTeamRankings
              : currentSubTab === "penalties"
                ? refetchPenaltyScope
                : undefined
          }
        />
      ) : showPenalties ? (
        <div className="space-y-6">
          {venue !== "all" && (
            <p className="text-sm text-muted-foreground">
              {venue === "home" ? "Home" : "Road"} games only: every rate below counts just those games, except
              Calls by arena, which is always each team&apos;s home games.
            </p>
          )}
          {currentView === "charts" ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="lg:col-span-2">
                {venueData ? (
                  <PenaltySeasonHeatmap
                    data={venueData}
                    venue={venue}
                    stat={stat ?? "drawnPer60"}
                    order={order ?? "fewest"}
                    layout={layout ?? "all"}
                    plot={plot ?? "value"}
                    highlighted={highlightedTeams != null ? highlightedTeams.split(",").filter(Boolean) : undefined}
                    from={from}
                    to={to}
                    sortSeason={sortSeason}
                    highlightSeason={effectiveSeason}
                    onChange={(updates) => updateSearch(updates)}
                  />
                ) : (
                  <Skeleton className="h-160 rounded-2xl" />
                )}
              </div>
              {venueData && (
                <ArenaPenaltiesCard
                  data={venueData}
                  season={effectiveSeason}
                  metric={arenaMetric ?? "calls"}
                  range={arenaRange ?? "three"}
                  onChange={(updates) => updateSearch(updates)}
                />
              )}
              <TeamPenaltyBars teams={penaltyTeams} metric="net" season={effectiveSeason} />
              <TeamPenaltyBars teams={penaltyTeams} metric="drawn" season={effectiveSeason} />
              <TeamPenaltyBars teams={penaltyTeams} metric="taken" season={effectiveSeason} />
              <div className="lg:col-span-2">
                <TeamPenaltyScatter teams={penaltyTeams} season={effectiveSeason} />
              </div>
              <TeamPenaltyBars teams={penaltyTeams} metric="netTime" season={effectiveSeason} />
            </div>
          ) : (
            <TeamPenaltiesTable teams={penaltyTeams} season={effectiveSeason} />
          )}
        </div>
      ) : currentTab === "teams" ? (
        currentView === "charts" ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <TeamSpecialTeamsBars
              teams={teamRankingsData?.teams ?? []}
              metric="pp"
              season={effectiveSeason}
            />
            <TeamSpecialTeamsBars
              teams={teamRankingsData?.teams ?? []}
              metric="pk"
              season={effectiveSeason}
            />
            <div className="lg:col-span-2">
              <PPvsPKScatter
                teams={teamRankingsData?.teams ?? []}
                season={effectiveSeason}
              />
            </div>
          </div>
        ) : (
          <TeamRankingsTable teams={teamRankingsData?.teams ?? []} season={effectiveSeason} />
        )
      ) : currentView === "charts" ? (
        currentSubTab === "penalties" ? (
          <PenaltyDiffScatter
            players={penaltyPlayers}
            scopeLabel={penaltyScopeLabel}
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <PlayerLeadersBars
              players={playerLeadersData?.players ?? []}
              situation={situation}
              metric="points"
            />
            <PlayerLeadersBars
              players={playerLeadersData?.players ?? []}
              situation={situation}
              metric="pointsPer60"
            />
          </div>
        )
      ) : currentSubTab === "penalties" ? (
        <PenaltyStatsTable players={penaltyPlayers} season={effectiveSeason} />
      ) : (
        <PlayerLeadersTable
          players={playerLeadersData?.players ?? []}
          situation={situation}
          season={effectiveSeason}
        />
      )}
    </div>
  );
}
