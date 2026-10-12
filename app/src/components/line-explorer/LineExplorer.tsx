import { useMemo } from "react";
import { Layers, BarChart3, TableIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { SeasonSelector, ErrorState } from "@/components/shared";
import { useLines, useTeamSeasons } from "@/hooks";
import { LineFilters } from "@/components/line-explorer/LineFilters";
import { LineTable } from "@/components/line-explorer/LineTable";
import {
  LineEffectivenessChart,
  TOIvsXGScatter,
  GoalsForAgainstChart,
} from "@/components/line-explorer/charts";
import type { LineType, LineSortField, SortDirection } from "@/types";

type ViewMode = "table" | "charts";

interface LineExplorerProps {
  teamAbbrev: string;
  season?: number;
  onSeasonChange: (season: number | undefined) => void;
  lineType: LineType;
  onLineTypeChange: (type: LineType) => void;
  minToi: number;
  onMinToiChange: (minToi: number) => void;
  sortBy: LineSortField;
  onSortByChange: (sortBy: LineSortField) => void;
  sortDir: SortDirection;
  onSortDirChange: (sortDir: SortDirection) => void;
  page: number;
  onPageChange: (page: number) => void;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

const PAGE_SIZE = 20;

export function LineExplorer({
  teamAbbrev,
  season,
  onSeasonChange,
  lineType,
  onLineTypeChange,
  minToi,
  onMinToiChange,
  sortBy,
  onSortByChange,
  sortDir,
  onSortDirChange,
  page,
  onPageChange,
  view,
  onViewChange,
}: LineExplorerProps) {
  // Get available seasons for this team
  const { data: seasonsData } = useTeamSeasons(teamAbbrev);
  const defaultSeason = seasonsData?.seasons?.[0]?.year;

  // Use provided season or fall back to default
  const effectiveSeason = season ?? defaultSeason;

  // Fetch lines data (only 5v5 data is available from MoneyPuck)
  const { data, isLoading, error, refetch } = useLines(teamAbbrev, {
    season: effectiveSeason!,
    situation: "5on5",
    lineType,
    minToi, // API expects minutes, converts to seconds internally
    sortBy,
    sortDir,
    page,
    pageSize: PAGE_SIZE,
  });

  // Calculate team averages for color coding
  const lines = data?.lines;
  const teamAverages = useMemo(() => {
    if (!lines || lines.length === 0) {
      return { xgPct: 50, cfPct: 50 };
    }

    let totalXg = 0;
    let totalCf = 0;
    let xgCount = 0;
    let cfCount = 0;

    for (const line of lines) {
      if (line.expectedGoalsPct != null) {
        totalXg += line.expectedGoalsPct;
        xgCount++;
      }
      if (line.corsiPct != null) {
        totalCf += line.corsiPct;
        cfCount++;
      }
    }

    return {
      xgPct: xgCount > 0 ? totalXg / xgCount : 50,
      cfPct: cfCount > 0 ? totalCf / cfCount : 50,
    };
  }, [lines]);

  const totalPages = data?.totalPages ?? 1;
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  const isForwardLine = lineType === "forward";

  const handleSort = (key: LineSortField) => {
    if (key === sortBy) {
      // Toggle direction if same column
      onSortDirChange(sortDir === "desc" ? "asc" : "desc");
    } else {
      // New column - default to descending
      onSortByChange(key);
      onSortDirChange("desc");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Line Combinations
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <SeasonSelector
              value={effectiveSeason}
              onValueChange={onSeasonChange}
              teamAbbrev={teamAbbrev}
            />
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                variant={view === "charts" ? "default" : "ghost"}
                size="sm"
                onClick={() => onViewChange("charts")}
                className="gap-1 px-2 sm:gap-2 sm:px-3"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden xs:inline">Charts</span>
              </Button>
              <Button
                variant={view === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => onViewChange("table")}
                className="gap-1 px-2 sm:gap-2 sm:px-3"
              >
                <TableIcon className="h-4 w-4" />
                <span className="hidden xs:inline">Table</span>
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <LineFilters
          lineType={lineType}
          onLineTypeChange={onLineTypeChange}
          minToi={minToi}
          onMinToiChange={onMinToiChange}
        />
        {error && (
          <ErrorState
            title="Failed to load lines"
            message="Could not fetch line combination data. Please try again."
            onRetry={() => refetch()}
            variant="inline"
          />
        )}
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        )}
        {!isLoading && !error && data && (
          <>
            {view === "charts" ? (
              <div className="space-y-8">
                <LineEffectivenessChart
                  lines={data.lines}
                  isForwardLine={isForwardLine}
                />
                <TOIvsXGScatter
                  lines={data.lines}
                  isForwardLine={isForwardLine}
                />
                <GoalsForAgainstChart
                  lines={data.lines}
                  isForwardLine={isForwardLine}
                />
              </div>
            ) : (
              <>
                <LineTable
                  lines={data.lines}
                  teamAvgXgPct={teamAverages.xgPct}
                  teamAvgCfPct={teamAverages.cfPct}
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
                {totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Page {page} of {totalPages} ({data.totalCount} lines)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(page - 1)}
                        disabled={!hasPrevPage}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(page + 1)}
                        disabled={!hasNextPage}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
        {!effectiveSeason && !isLoading && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="font-medium">Select a season to view line combinations</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
