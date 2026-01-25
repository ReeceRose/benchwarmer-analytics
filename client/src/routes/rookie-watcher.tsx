import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Baby, Info, Filter, BarChart3, TableIcon } from "lucide-react";
import { useRookies, useSeasons, useSortableTable } from "@/hooks";
import { getCurrentSeason } from "@/lib/date-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared";
import {
  RookieTable,
  RookieProductionChart,
  GoalsVsExpectedChart,
  RookieAgeDistributionChart,
  type RookieSortKey,
} from "@/components/rookie-watcher";
import type { Rookie, RookiePositionFilter } from "@/types";

export const Route = createFileRoute("/rookie-watcher")({
  component: RookieWatcherPage,
  validateSearch: (search: Record<string, unknown>) => ({
    view: (search.view as "table" | "charts") ?? "table",
  }),
});

function RookieWatcherPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const { view: currentView } = Route.useSearch();

  const defaultSeason = getCurrentSeason();
  const { data: seasonsData } = useSeasons();

  const [season, setSeason] = useState<number | undefined>(undefined);
  const [minGames, setMinGames] = useState(10);
  const [position, setPosition] = useState<RookiePositionFilter>("all");

  const updateView = (view: "table" | "charts") => {
    navigate({ search: (prev) => ({ ...prev, view }) });
  };

  const effectiveSeason =
    season ?? seasonsData?.seasons?.[0]?.year ?? defaultSeason;

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
    <div className="container py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Baby className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Rookie Watcher</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl">
          Track first-year NHL skaters meeting league rookie criteria: no prior
          season with 26+ games played and under 26 years old as of September
          15. Goalies are not included.
        </p>
      </div>

      <Card className="mb-6 py-3 px-4">
        <div className="flex items-start gap-3">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Rookie Score</span>{" "}
            combines: <strong>Points</strong> (weighted x2),{" "}
            <strong>Goals vs Expected</strong> (G - xG),{" "}
            <strong>Corsi For %</strong> (possession metric), and{" "}
            <strong>Shots/60</strong> (opportunity creation). Adjusted for{" "}
            <strong>position</strong> (defensemen get 1.3x production boost) and{" "}
            <strong>age</strong> (younger rookies score higher).
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <Tabs
            value={position}
            onValueChange={(v) => setPosition(v as RookiePositionFilter)}
          >
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="forwards">Forwards</TabsTrigger>
              <TabsTrigger value="defensemen">Defensemen</TabsTrigger>
            </TabsList>
          </Tabs>

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
            <span className="text-sm text-muted-foreground">Min GP:</span>
            <Select
              value={String(minGames)}
              onValueChange={(v) => setMinGames(parseInt(v))}
            >
              <SelectTrigger className="w-20 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5+</SelectItem>
                <SelectItem value="10">10+</SelectItem>
                <SelectItem value="15">15+</SelectItem>
                <SelectItem value="20">20+</SelectItem>
                <SelectItem value="25">25+</SelectItem>
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
          title="Failed to load rookies"
          message="Could not fetch rookie data. Please try again."
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
        <Card>
          <CardContent className="py-12 text-center">
            <Baby className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium">No rookies found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting the filters or selecting a different season.
            </p>
          </CardContent>
        </Card>
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
