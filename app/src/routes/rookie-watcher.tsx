import { useState } from "react";
import {
  EmptyState,
  MetricGuide,
  PageHeader,
  SegmentedControl,
  ViewToggle,
} from "@/components/layout";
import { seasonsQueryOptions } from "@/hooks/useSeasons";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRookies, useSeasons, useSortableTable, usePageTitle, useSeasonMinGames } from "@/hooks";
import { getCurrentSeason } from "@/lib/date-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableSkeleton, ErrorState } from "@/components/shared";
import {
  RookieTable,
  RookieProductionChart,
  GoalsVsExpectedChart,
  RookieAgeDistributionChart,
  type RookieSortKey,
} from "@/components/rookie-watcher";
import type { Rookie, RookiePositionFilter } from "@/types";

const MIN_GAMES_OPTIONS = [1, 5, 10, 15, 20, 25] as const;

export const Route = createFileRoute("/rookie-watcher")({
  component: RookieWatcherPage,
  loader: ({ context }) =>
    context.queryClient.prefetchQuery(seasonsQueryOptions),
  validateSearch: (search: Record<string, unknown>) => ({
    view: (search.view as "table" | "charts") ?? "table",
  }),
});

function RookieWatcherPage() {
  usePageTitle("Rookie Watcher");

  const navigate = useNavigate({ from: Route.fullPath });
  const { view: currentView } = Route.useSearch();

  const defaultSeason = getCurrentSeason();
  const { data: seasonsData } = useSeasons();

  const [season, setSeason] = useState<number | undefined>(undefined);
  const [minGamesChoice, setMinGames] = useState<number | undefined>(undefined);
  const [position, setPosition] = useState<RookiePositionFilter>("all");

  const updateView = (view: "table" | "charts") => {
    navigate({ search: (prev) => ({ ...prev, view }) });
  };

  const effectiveSeason =
    season ?? seasonsData?.seasons?.[0]?.year ?? defaultSeason;
  const defaultMinGames = useSeasonMinGames(effectiveSeason, 10, MIN_GAMES_OPTIONS);
  const minGames = minGamesChoice ?? defaultMinGames;

  // Convert position filter for API
  const apiPosition =
    position === "all" ? undefined : position === "forwards" ? "F" : "D";

  const { data, isLoading, error, refetch } = useRookies(
    effectiveSeason,
    minGames,
    100,
    apiPosition
  );

  const {
    sortedData: sortedRookies,
    sortKey,
    sortDesc,
    handleSort,
  } = useSortableTable<Rookie, RookieSortKey>({
    data: data?.rookies ?? [],
    defaultSortKey: "rookieScore",
    defaultSortDesc: true,
    getValue: (rookie, key) => rookie[key] ?? 0,
  });

  return (
    <div className="container space-y-6 py-8">
      <PageHeader
        title="Rookie watcher"
        description="First-year skaters by the NHL's rookie rules: under 26 on September 15 and never more than 25 games in a prior season."
      />

      <MetricGuide metrics={["Rookie Score", "G-xG", "CF%", "Sh/60"]}>
        <p className="text-muted-foreground">
          Rookie score weights points double and adds finishing (goals minus
          expected), possession and shot rate. Defensemen get a 1.3× boost on
          production, and younger rookies score higher.
        </p>
      </MetricGuide>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            aria-label="Position"
            value={position}
            onValueChange={setPosition}
            options={[
              { value: "all", label: "All" },
              { value: "forwards", label: "Forwards" },
              { value: "defensemen", label: "Defense" },
            ]}
          />
          <Select
              value={String(effectiveSeason ?? "")}
              onValueChange={(v) => setSeason(parseInt(v))}
            >
              <SelectTrigger className="w-32" aria-label="Season">
                <SelectValue placeholder="Season" />
              </SelectTrigger>
              <SelectContent>
                {seasonsData?.seasons?.map((s) => (
                  <SelectItem key={s.year} value={String(s.year)}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          <Select
              value={String(minGames)}
              onValueChange={(v) => setMinGames(parseInt(v))}
            >
              <SelectTrigger className="w-32" aria-label="Minimum games">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MIN_GAMES_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n === 1 ? "Any games" : `${n}+ games`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
        </div>
        <ViewToggle value={currentView} onValueChange={updateView} />
      </div>

      {error && (
        <ErrorState
          title="Failed to load rookies"
          message="Could not fetch rookie data. Please try again."
          onRetry={() => refetch()}
        />
      )}

      {isLoading ? (
        <TableSkeleton rows={10} columns={10} />
      ) : data?.rookies && data.rookies.length > 0 ? (
        currentView === "charts" ? (
          <ChartsView rookies={data.rookies} />
        ) : (
          <RookieTable
            rookies={sortedRookies}
            sortKey={sortKey}
            sortDesc={sortDesc}
            onSort={handleSort}
          />
        )
      ) : (
        <EmptyState
          title="No rookies match these filters"
          hint="Lower the minimum games or pick another season."
        />
      )}
    </div>
  );
}

function ChartsView({ rookies }: { rookies: Rookie[] }) {
  return (
    <div className="space-y-6">
      <RookieProductionChart rookies={rookies} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GoalsVsExpectedChart rookies={rookies} />
        <RookieAgeDistributionChart rookies={rookies} />
      </div>
    </div>
  );
}
