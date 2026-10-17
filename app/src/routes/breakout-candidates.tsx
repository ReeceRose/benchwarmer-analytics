import { useState } from "react";
import {
  EmptyState,
  MetricGuide,
  PageHeader,
  ViewToggle,
} from "@/components/layout";
import { seasonsQueryOptions } from "@/hooks/useSeasons";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useBreakoutCandidates, useSeasons, useSortableTable, usePageTitle, useSeasonMinGames } from "@/hooks";
import { getCurrentSeason } from "@/lib/date-utils";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ErrorState,
  HeaderWithTooltip,
  SortableTableHeader,
  TableSkeleton,
} from "@/components/shared";
import {
  CandidateRow,
  BreakoutLuckChart,
  BreakoutScoreChart,
} from "@/components/breakout-candidates";
import type { BreakoutCandidate } from "@/types";

const MIN_GAMES_OPTIONS = [1, 5, 10, 20, 30, 40] as const;

export const Route = createFileRoute("/breakout-candidates")({
  component: BreakoutCandidatesPage,
  loader: ({ context }) =>
    context.queryClient.prefetchQuery(seasonsQueryOptions),
  validateSearch: (search: Record<string, unknown>) => ({
    view: (search.view as "table" | "charts") ?? "table",
  }),
});

type SortKey =
  | "breakoutScore"
  | "goalsDifferential"
  | "corsiForPct"
  | "shotsPer60";

function BreakoutCandidatesPage() {
  usePageTitle("Breakout Candidates");

  const navigate = useNavigate({ from: Route.fullPath });
  const { view: currentView } = Route.useSearch();

  // Use calculated default season immediately - don't wait for API
  const defaultSeason = getCurrentSeason();
  const { data: seasonsData } = useSeasons();

  const [season, setSeason] = useState<number | undefined>(undefined);
  const [minGamesChoice, setMinGames] = useState<number | undefined>(undefined);

  const updateView = (view: "table" | "charts") => {
    navigate({ search: (prev) => ({ ...prev, view }) });
  };

  // Prefer local state > API current season > calculated default
  const effectiveSeason = season ?? seasonsData?.seasons?.[0]?.year ?? defaultSeason;
  const defaultMinGames = useSeasonMinGames(effectiveSeason, 20, MIN_GAMES_OPTIONS);
  const minGames = minGamesChoice ?? defaultMinGames;
  const { data, isLoading, error, refetch } = useBreakoutCandidates(
    effectiveSeason,
    minGames,
    50
  );

  const {
    sortedData: sortedCandidates,
    sortKey,
    sortDesc,
    handleSort,
  } = useSortableTable<BreakoutCandidate, SortKey>({
    data: data?.candidates ?? [],
    defaultSortKey: "breakoutScore",
    defaultSortDesc: true,
    getValue: (candidate, key) => candidate[key] ?? 0,
  });

  return (
    <div className="container space-y-6 py-8">
      <PageHeader
        title="Breakout candidates"
        description="Skaters whose chances and possession say they should be scoring more than they are."
      />

      <MetricGuide metrics={["Breakout Score", "xG-G", "CF%", "Sh/60"]}>
        <p className="text-muted-foreground">
          Breakout score rewards players who are scoring below their expected
          goals while driving play (CF% above 50) and generating shots.
        </p>
      </MetricGuide>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
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
          title="Failed to load candidates"
          message="Could not fetch breakout candidates. Please try again."
          onRetry={() => refetch()}
        />
      )}

      {isLoading ? (
        <TableSkeleton rows={10} columns={10} />
      ) : data?.candidates && data.candidates.length > 0 ? (
        currentView === "charts" ? (
          <ChartsView candidates={data.candidates} />
        ) : (
          <Card className="gap-0 overflow-hidden py-0">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead className="sticky left-0 z-10 bg-card">Player</TableHead>
                      <TableHead>Pos</TableHead>
                      <TableHead>Team</TableHead>
                      <HeaderWithTooltip
                        label="GP"
                        tooltip="Games played"
                        className="text-right"
                      />
                      <HeaderWithTooltip
                        label="G"
                        tooltip="Goals"
                        className="text-right"
                      />
                      <HeaderWithTooltip
                        label="xG"
                        tooltip="Expected goals based on shot quality"
                        className="text-right"
                      />
                      <SortableTableHeader
                        label="xG − G"
                        tooltip="Goals below expected (xG minus goals). Bigger means unluckier."
                        metric="xG-G"
                        sortKey="goalsDifferential"
                        currentSort={sortKey}
                        sortDesc={sortDesc}
                        onSort={handleSort}
                      />
                      <SortableTableHeader
                        label="CF%"
                        tooltip="Corsi For % (shot attempt share)"
                        metric="CF%"
                        sortKey="corsiForPct"
                        currentSort={sortKey}
                        sortDesc={sortDesc}
                        onSort={handleSort}
                      />
                      <SortableTableHeader
                        label="Sh/60"
                        tooltip="Shots per 60 minutes"
                        metric="Sh/60"
                        sortKey="shotsPer60"
                        currentSort={sortKey}
                        sortDesc={sortDesc}
                        onSort={handleSort}
                      />
                      <SortableTableHeader
                        label="Score"
                        tooltip="Combined breakout score (higher = more likely to break out)"
                        metric="Breakout Score"
                        sortKey="breakoutScore"
                        currentSort={sortKey}
                        sortDesc={sortDesc}
                        onSort={handleSort}
                      />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedCandidates.map((candidate, index) => (
                      <CandidateRow
                        key={candidate.playerId}
                        candidate={candidate}
                        rank={index + 1}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <EmptyState
          title="No breakout candidates match these filters"
          hint="Lower the minimum games or pick another season."
        />
      )}
    </div>
  );
}

// Charts View Component
function ChartsView({ candidates }: { candidates: BreakoutCandidate[] }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BreakoutScoreChart candidates={candidates} />
        <BreakoutLuckChart candidates={candidates} />
      </div>
    </div>
  );
}
