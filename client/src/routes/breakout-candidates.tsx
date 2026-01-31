import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TrendingUp, Info, Filter, BarChart3, TableIcon } from "lucide-react";
import { useBreakoutCandidates, useSeasons, useSortableTable, usePageTitle } from "@/hooks";
import { getCurrentSeason } from "@/lib/date-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  ErrorState,
  HeaderWithTooltip,
  SortableTableHeader,
} from "@/components/shared";
import {
  CandidateRow,
  BreakoutLuckChart,
  BreakoutScoreChart,
} from "@/components/breakout-candidates";
import type { BreakoutCandidate } from "@/types";

export const Route = createFileRoute("/breakout-candidates")({
  component: BreakoutCandidatesPage,
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
  const [minGames, setMinGames] = useState(20);

  const updateView = (view: "table" | "charts") => {
    navigate({ search: (prev) => ({ ...prev, view }) });
  };

  // Prefer local state > API current season > calculated default
  const effectiveSeason = season ?? seasonsData?.seasons?.[0]?.year ?? defaultSeason;
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
    <div className="container py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">
            Breakout Candidates
          </h1>
        </div>
        <p className="text-muted-foreground max-w-2xl">
          Players with strong underlying metrics who may be poised for a
          breakout. These players have high expected goals (xG), good possession
          numbers, but have scored fewer goals than expected.
        </p>
      </div>

      <Card className="mb-6 py-3 px-4">
        <div className="flex items-start gap-3">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Breakout Score</span>{" "}
            combines: <strong>Goals Differential</strong> (xG - G, positive =
            unlucky), <strong>Corsi For %</strong> (shot attempt share, above
            50% = driving play), <strong>Shots/60</strong> (higher = more
            opportunities).
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={String(effectiveSeason ?? "")}
              onValueChange={(v) => setSeason(parseInt(v))}
            >
              <SelectTrigger className="w-36 h-9">
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
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Min Games:</span>
            <Select
              value={String(minGames)}
              onValueChange={(v) => setMinGames(parseInt(v))}
            >
              <SelectTrigger className="w-20 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10+</SelectItem>
                <SelectItem value="20">20+</SelectItem>
                <SelectItem value="30">30+</SelectItem>
                <SelectItem value="40">40+</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button
            variant={currentView === "charts" ? "default" : "ghost"}
            size="sm"
            onClick={() => updateView("charts")}
            className="gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Charts
          </Button>
          <Button
            variant={currentView === "table" ? "default" : "ghost"}
            size="sm"
            onClick={() => updateView("table")}
            className="gap-2"
          >
            <TableIcon className="h-4 w-4" />
            Table
          </Button>
        </div>
      </div>

      {error && (
        <ErrorState
          title="Failed to load candidates"
          message="Could not fetch breakout candidates. Please try again."
          onRetry={() => refetch()}
        />
      )}

      {isLoading ? (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : data?.candidates && data.candidates.length > 0 ? (
        currentView === "charts" ? (
          <ChartsView candidates={data.candidates} />
        ) : (
          <Card className="py-0 gap-0">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Player</TableHead>
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
                        label="G Diff"
                        tooltip="Goals below expected (xG - G). Positive = unlucky"
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
        <Card>
          <CardContent className="py-12 text-center">
            <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium">No candidates found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting the filters or selecting a different season.
            </p>
          </CardContent>
        </Card>
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
