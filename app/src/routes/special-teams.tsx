import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { seasonsQueryOptions } from "@/hooks/useSeasons";
import * as z from "zod/mini";
import {
  useSpecialTeamsTeamRankings,
  useSpecialTeamsPlayerLeaders,
  usePlayerPenaltyStats,
  useSeasons,
  usePageTitle,
} from "@/hooks";
import { getCurrentSeason } from "@/lib/date-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ErrorState, TableSkeleton } from "@/components/shared";
import { PageHeader, SegmentedControl, ViewToggle } from "@/components/layout";
import {
  TeamRankingsTable,
  PlayerLeadersTable,
  PenaltyStatsTable,
  TeamSpecialTeamsBars,
  PPvsPKScatter,
  PlayerLeadersBars,
  PenaltyDiffScatter,
} from "@/components/special-teams-stats";

const searchSchema = z.object({
  tab: z.optional(z.enum(["teams", "players"])),
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
  const currentView = urlView ?? "table";
  const currentSubTab = urlSubTab ?? "pp";
  const penaltyScope = urlPenaltyScope ?? "both";
  const minToi = urlMinToi ?? 50;
  const position = urlPosition;
  const team = urlTeam;

  const updateSearch = (updates: Partial<z.infer<typeof searchSchema>>) => {
    navigate({ search: (prev) => ({ ...prev, ...updates }) });
  };

  // Team rankings data
  const {
    data: teamRankingsData,
    isLoading: teamRankingsLoading,
    error: teamRankingsError,
    refetch: refetchTeamRankings,
  } = useSpecialTeamsTeamRankings(effectiveSeason, false);

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
      ? "Best 100 by Net/60"
      : penaltyScope === "worst"
        ? "Worst 100 by Net/60"
        : `Best ${EXTREME_LIMIT} + Worst ${EXTREME_LIMIT} by Net/60`;

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
      ? teamRankingsLoading
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
          <Select
            value={String(effectiveSeason)}
            onValueChange={(v) => updateSearch({ season: Number(v) })}
          >
            <SelectTrigger className="w-32" aria-label="Season">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {seasonsData?.seasons.map((s) => (
                <SelectItem key={s.year} value={String(s.year)}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <TableSkeleton rows={10} columns={10} />
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
      ) : currentTab === "teams" ? (
        // Teams Tab
        currentView === "charts" ? (
          <div className="grid lg:grid-cols-2 gap-6">
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
      ) : // Players Tab
      currentView === "charts" ? (
        // Players Charts View
        currentSubTab === "penalties" ? (
          <PenaltyDiffScatter
            players={penaltyPlayers}
            scopeLabel={penaltyScopeLabel}
          />
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
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
      ) : // Players Table View
      currentSubTab === "penalties" ? (
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
