import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as z from "zod/mini";
import { useLeagueTrends, usePageTitle } from "@/hooks";
import { getCurrentSeason } from "@/lib/date-utils";
import { formatSeason, formatToi } from "@/lib/formatters";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared";
import { EmptyState, PageHeader, SegmentedControl, StatTile } from "@/components/layout";
import {
  LeagueTrendsChart,
  TREND_METRICS,
  type TrendMetric,
} from "@/components/league-trends";
import { AttendanceChart } from "@/components/league-trends/AttendanceChart";
import type { SeasonTrend } from "@/types";

const situationSchema = z.enum(["all", "5on5", "5on4", "4on5"]);
type Situation = z.infer<typeof situationSchema>;

const searchSchema = z.object({
  situation: z.optional(situationSchema),
  metric: z.optional(
    z.enum(["avgGoalsPerGame", "avgAssistsPerGame", "avgToiPerGame", "avgCorsiPct", "avgXgPer60"]),
  ),
});

export const Route = createFileRoute("/league-trends")({
  component: LeagueTrendsPage,
  validateSearch: searchSchema,
});

const situationOptions: { value: Situation; label: string }[] = [
  { value: "all", label: "All" },
  { value: "5on5", label: "5v5" },
  { value: "5on4", label: "Power play" },
  { value: "4on5", label: "Penalty kill" },
];

// The current season counts as in progress until it has most of a full season's games.
function isInProgress(seasons: SeasonTrend[]): boolean {
  const last = seasons[seasons.length - 1];
  const previous = seasons[seasons.length - 2];
  if (!last || !previous || last.season !== getCurrentSeason()) return false;
  return last.totalGamesPlayed < previous.totalGamesPlayed * 0.9;
}

function LeagueTrendsPage() {
  usePageTitle("League Trends");

  const navigate = useNavigate({ from: Route.fullPath });
  const { situation = "all", metric = "avgGoalsPerGame" } = Route.useSearch();

  const { data, isLoading, error, refetch } = useLeagueTrends(situation);

  const updateSearch = (updates: Partial<{ situation: Situation; metric: TrendMetric }>) => {
    navigate({ search: (prev) => ({ ...prev, ...updates }) });
  };

  const seasons = data?.seasons ?? [];
  const inProgress = isInProgress(seasons);

  return (
    <div className="container space-y-6 py-8">
      <PageHeader
        title="League trends"
        description="How scoring, possession and ice time have changed across the league, season by season."
      />

      <SegmentedControl
        aria-label="Situation"
        value={situation}
        onValueChange={(v) => updateSearch({ situation: v })}
        options={situationOptions}
      />

      {error && (
        <ErrorState
          title="Failed to load trends"
          message="Could not fetch league trend data. Please try again."
          onRetry={() => refetch()}
        />
      )}

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-100 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      ) : seasons.length > 0 ? (
        <div className="space-y-6">
          <LatestSeasonTiles seasons={seasons} inProgress={inProgress} />
          <LeagueTrendsChart
            data={seasons}
            metric={metric}
            onMetricChange={(m) => updateSearch({ metric: m })}
            lastInProgress={inProgress}
          />
          <SeasonTable seasons={seasons} inProgress={inProgress} />
          <AttendanceChart />
        </div>
      ) : (
        !error && (
          <EmptyState
            title="No trend data for this situation"
            hint="Pick another situation."
          />
        )
      )}
    </div>
  );
}

const TILE_METRICS: TrendMetric[] = ["avgGoalsPerGame", "avgAssistsPerGame", "avgXgPer60", "avgToiPerGame"];

/** The latest season's headline numbers, each against the season before. */
function LatestSeasonTiles({ seasons, inProgress }: { seasons: SeasonTrend[]; inProgress: boolean }) {
  const latest = seasons[seasons.length - 1];
  const previous = seasons[seasons.length - 2];
  const season = `${formatSeason(latest.season)}${inProgress ? " so far" : ""}`;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {TILE_METRICS.map((m) => {
        const { label, format } = TREND_METRICS[m];
        return (
          <StatTile
            key={m}
            label={label}
            value={format(latest[m])}
            note={
              previous
                ? `${season} · ${format(previous[m])} in ${formatSeason(previous.season)}`
                : season
            }
          />
        );
      })}
    </div>
  );
}

function SeasonTable({ seasons, inProgress }: { seasons: SeasonTrend[]; inProgress: boolean }) {
  const latest = seasons[seasons.length - 1]?.season;
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table className="min-w-160">
            <TableHeader>
              <TableRow>
                <TableHead>Season</TableHead>
                <TableHead className="text-right">Players</TableHead>
                <TableHead className="text-right">GP</TableHead>
                <TableHead className="text-right">Goals</TableHead>
                <TableHead className="text-right">G/GP</TableHead>
                <TableHead className="text-right">A/GP</TableHead>
                <TableHead className="text-right">xG/60</TableHead>
                <TableHead className="text-right">TOI/GP</TableHead>
                <TableHead className="text-right">CF%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...seasons].reverse().map((s) => (
                <TableRow key={s.season}>
                  <TableCell className="font-medium">
                    {formatSeason(s.season)}
                    {inProgress && s.season === latest && (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">so far</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{s.totalPlayers.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{s.totalGamesPlayed.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{s.totalGoals.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{s.avgGoalsPerGame.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{s.avgAssistsPerGame.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{s.avgXgPer60.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{formatToi(s.avgToiPerGame)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{s.avgCorsiPct.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
