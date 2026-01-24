import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Trophy, Info, Filter } from "lucide-react";
import { usePowerRankings, useSeasons, useSortableTable } from "@/hooks";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  ErrorState,
  HeaderWithTooltip,
  SortableTableHeader,
} from "@/components/shared";
import { TeamRow, RegressionCard } from "@/components/power-rankings";
import type { TeamPowerRanking } from "@/types";
import { z } from "zod";

const searchSchema = z.object({
  season: z.number().optional(),
});

export const Route = createFileRoute("/power-rankings")({
  component: PowerRankingsPage,
  validateSearch: searchSchema,
});

type SortKey = "points" | "xGoalsPct" | "pdo" | "pointsDiff" | "corsiPct";

function PowerRankingsPage() {
  const { data: seasonsData } = useSeasons();
  const currentSeason = seasonsData?.seasons?.[0]?.year;
  const navigate = useNavigate({ from: Route.fullPath });
  const { season } = Route.useSearch();

  const effectiveSeason = season ?? currentSeason;
  const isCurrentSeason = effectiveSeason === currentSeason;
  const { data, isLoading, error, refetch } = usePowerRankings(effectiveSeason);

  const { sortedData: sortedTeams, sortKey, sortDesc, handleSort } =
    useSortableTable<TeamPowerRanking, SortKey>({
      data: data?.teams ?? [],
      defaultSortKey: "points",
      defaultSortDesc: true,
      getValue: (team, key) => team[key] ?? 0,
    });

  return (
    <div className="container py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Power Rankings</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl">
          League-wide team rankings combining traditional standings with
          advanced analytics. Identify teams that are over or underperforming
          their underlying metrics.
        </p>
      </div>

      <Card className="mb-6 py-3 px-4">
        <div className="flex items-start gap-3">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Key Metrics: </span>
            <strong>xG%</strong> (expected goals share - team&apos;s scoring
            chance quality), <strong>CF%</strong> (Corsi - shot attempt share),{" "}
            <strong>PDO</strong> (shooting% + save% - values near 100 are
            sustainable, extreme values regress).
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={String(effectiveSeason ?? "")}
            onValueChange={(v) => navigate({ search: { season: parseInt(v) } })}
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
      </div>

      {isCurrentSeason &&
        data?.insights &&
        (data.insights.likelyToImprove.length > 0 ||
          data.insights.likelyToRegress.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <RegressionCard
              title="Likely to Improve"
              icon="up"
              candidates={data.insights.likelyToImprove}
              season={effectiveSeason}
            />
            <RegressionCard
              title="Likely to Regress"
              icon="down"
              candidates={data.insights.likelyToRegress}
              season={effectiveSeason}
            />
          </div>
        )}

      {error && (
        <ErrorState
          title="Failed to load rankings"
          message="Could not fetch power rankings. Please try again."
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
      ) : data?.teams && data.teams.length > 0 ? (
        <>
          <Card className="py-0 gap-0">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Team</TableHead>
                      <HeaderWithTooltip
                        label="GP"
                        tooltip="Games played"
                        className="text-right"
                      />
                      <HeaderWithTooltip
                        label="W"
                        tooltip="Wins"
                        className="text-right"
                      />
                      <HeaderWithTooltip
                        label="L"
                        tooltip="Losses"
                        className="text-right"
                      />
                      <HeaderWithTooltip
                        label="OTL"
                        tooltip="Overtime losses"
                        className="text-right"
                      />
                      <SortableTableHeader
                        label="Pts"
                        tooltip="Points (W×2 + OTL)"
                        sortKey="points"
                        currentSort={sortKey}
                        sortDesc={sortDesc}
                        onSort={handleSort}
                      />
                      <HeaderWithTooltip
                        label="GF"
                        tooltip="Goals for"
                        className="text-right"
                      />
                      <HeaderWithTooltip
                        label="GA"
                        tooltip="Goals against"
                        className="text-right"
                      />
                      <SortableTableHeader
                        label="xG%"
                        tooltip="Expected goals percentage (share of expected goals)"
                        sortKey="xGoalsPct"
                        currentSort={sortKey}
                        sortDesc={sortDesc}
                        onSort={handleSort}
                      />
                      <SortableTableHeader
                        label="CF%"
                        tooltip="Corsi percentage (shot attempt share)"
                        sortKey="corsiPct"
                        currentSort={sortKey}
                        sortDesc={sortDesc}
                        onSort={handleSort}
                      />
                      <SortableTableHeader
                        label="PDO"
                        tooltip="Shooting% + Save% (values near 100 are sustainable)"
                        sortKey="pdo"
                        currentSort={sortKey}
                        sortDesc={sortDesc}
                        onSort={handleSort}
                      />
                      <SortableTableHeader
                        label="Pts±"
                        tooltip="Points above/below expected (positive = overperforming)"
                        sortKey="pointsDiff"
                        currentSort={sortKey}
                        sortDesc={sortDesc}
                        onSort={handleSort}
                      />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedTeams.map((team, index) => (
                      <TeamRow
                        key={team.abbreviation}
                        team={team}
                        rank={index + 1}
                        season={effectiveSeason}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          <div className="flex items-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-green-600 dark:bg-green-400" />
              <span className="text-muted-foreground">
                Strong / Underperforming (room to improve)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-muted-foreground" />
              <span className="text-muted-foreground">
                Average / Sustainable
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-red-600 dark:bg-red-400" />
              <span className="text-muted-foreground">
                Weak / Overperforming (likely to regress)
              </span>
            </div>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium">No data available</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try selecting a different season.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
