import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Users, Building2, BarChart3, TableIcon, Zap, Shield, Scale } from "lucide-react";
import { z } from "zod";
import {
  useSpecialTeamsTeamRankings,
  useSpecialTeamsPlayerLeaders,
  usePlayerPenaltyStats,
  useSeasons,
  usePageTitle,
} from "@/hooks";
import { getCurrentSeason } from "@/lib/date-utils";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared";
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
  tab: z.enum(["teams", "players"]).optional(),
  season: z.number().optional(),
  view: z.enum(["charts", "table"]).optional(),
  subTab: z.enum(["pp", "pk", "penalties"]).optional(),
  penaltyScope: z.enum(["best", "worst", "both"]).optional(),
  minToi: z.number().optional(),
  position: z.enum(["F", "D"]).optional(),
  team: z.string().optional(),
});

export const Route = createFileRoute("/special-teams")({
  component: SpecialTeamsPage,
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
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-yellow-500" />
            Special Teams
          </h1>
          <p className="text-muted-foreground">
            League-wide power play and penalty kill statistics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Label className="text-sm text-muted-foreground">Season</Label>
          <Select
            value={String(effectiveSeason)}
            onValueChange={(v) => updateSearch({ season: Number(v) })}
          >
            <SelectTrigger className="w-32">
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
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Tabs
          value={currentTab}
          onValueChange={(v) => updateSearch({ tab: v as "teams" | "players" })}
        >
          <TabsList>
            <TabsTrigger value="teams" className="gap-2">
              <Building2 className="h-4 w-4" />
              Teams
            </TabsTrigger>
            <TabsTrigger value="players" className="gap-2">
              <Users className="h-4 w-4" />
              Players
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button
            variant={currentView === "charts" ? "default" : "ghost"}
            size="sm"
            onClick={() => updateSearch({ view: "charts" })}
            className="gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Charts
          </Button>
          <Button
            variant={currentView === "table" ? "default" : "ghost"}
            size="sm"
            onClick={() => updateSearch({ view: "table" })}
            className="gap-2"
          >
            <TableIcon className="h-4 w-4" />
            Table
          </Button>
        </div>
      </div>

      {currentTab === "players" && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Tabs
                value={currentSubTab}
                onValueChange={(v) =>
                  updateSearch({ subTab: v as "pp" | "pk" | "penalties" })
                }
              >
                <TabsList>
                  <TabsTrigger value="pp" className="gap-1.5">
                    <Zap className="h-3.5 w-3.5" />
                    Power Play
                  </TabsTrigger>
                  <TabsTrigger value="pk" className="gap-1.5">
                    <Shield className="h-3.5 w-3.5" />
                    Penalty Kill
                  </TabsTrigger>
                  <TabsTrigger value="penalties" className="gap-1.5">
                    <Scale className="h-3.5 w-3.5" />
                    Penalties
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex flex-wrap items-center gap-4 ml-auto">
                {currentSubTab === "penalties" && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">
                      Scope
                    </Label>
                    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                      <Button
                        variant={penaltyScope === "best" ? "default" : "ghost"}
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => updateSearch({ penaltyScope: "best" })}
                      >
                        Best
                      </Button>
                      <Button
                        variant={penaltyScope === "both" ? "default" : "ghost"}
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => updateSearch({ penaltyScope: "both" })}
                      >
                        Both
                      </Button>
                      <Button
                        variant={penaltyScope === "worst" ? "default" : "ghost"}
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => updateSearch({ penaltyScope: "worst" })}
                      >
                        Worst
                      </Button>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">
                    Min TOI
                  </Label>
                  <Input
                    type="number"
                    value={minToi}
                    onChange={(e) =>
                      updateSearch({ minToi: Number(e.target.value) || 50 })
                    }
                    className="w-20 h-8"
                    min={0}
                    max={500}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">
                    Position
                  </Label>
                  <Select
                    value={position ?? "all"}
                    onValueChange={(v) =>
                      updateSearch({
                        position: v === "all" ? undefined : (v as "F" | "D"),
                      })
                    }
                  >
                    <SelectTrigger className="w-24 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="F">Forwards</SelectItem>
                      <SelectItem value="D">Defense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </CardContent>
        </Card>
      ) : hasError ? (
        <ErrorState
          title="Failed to load data"
          message="Unable to fetch special teams statistics."
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
          <Card>
            <CardContent className="pt-4">
              <TeamRankingsTable teams={teamRankingsData?.teams ?? []} season={effectiveSeason} />
            </CardContent>
          </Card>
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
        <Card>
          <CardContent className="pt-4">
            <PenaltyStatsTable players={penaltyPlayers} season={effectiveSeason} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <PlayerLeadersTable
              players={playerLeadersData?.players ?? []}
              situation={situation}
              season={effectiveSeason}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
