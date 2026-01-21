import { useMemo } from "react";
import { Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { SeasonSelector, ErrorState } from "@/components/shared";
import { useLines, useTeamSeasons } from "@/hooks";
import { LineFilters } from "@/components/line-explorer/LineFilters";
import { LineTable } from "@/components/line-explorer/LineTable";
import type { LineType, LineSortField, SortDirection } from "@/types";

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
        totalXg += line.expectedGoalsPct * 100;
        xgCount++;
      }
      if (line.corsiPct != null) {
        totalCf += line.corsiPct * 100;
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

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Line Combinations
          </CardTitle>
          <SeasonSelector
            value={effectiveSeason}
            onValueChange={onSeasonChange}
            teamAbbrev={teamAbbrev}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <LineFilters
          lineType={lineType}
          onLineTypeChange={onLineTypeChange}
          minToi={minToi}
          onMinToiChange={onMinToiChange}
          sortBy={sortBy}
          onSortByChange={onSortByChange}
          sortDir={sortDir}
          onSortDirChange={onSortDirChange}
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
            <LineTable
              lines={data.lines}
              teamAvgXgPct={teamAverages.xgPct}
              teamAvgCfPct={teamAverages.cfPct}
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
        {!effectiveSeason && !isLoading && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="font-medium">Select a season to view line combinations</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
