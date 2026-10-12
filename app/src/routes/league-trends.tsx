import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLeagueTrends, usePageTitle } from "@/hooks";
import { formatSeason, formatToi } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared";
import { PageHeader, StatTile, EmptyState } from "@/components/layout";
import {
  LeagueTrendsChart,
  type TrendMetric,
} from "@/components/league-trends";

const searchSchema = {
  situation: "all" as string,
  metric: "avgGoalsPerGame" as TrendMetric,
};

export const Route = createFileRoute("/league-trends")({
  component: LeagueTrendsPage,
  validateSearch: (search: Record<string, unknown>) => ({
    situation: (search.situation as string) ?? searchSchema.situation,
    metric: (search.metric as TrendMetric) ?? searchSchema.metric,
  }),
});

const situationOptions = [
  { value: "all", label: "All situations" },
  { value: "5on5", label: "5v5" },
  { value: "5on4", label: "Power play" },
  { value: "4on5", label: "Penalty kill" },
];

const metricOptions: { value: TrendMetric; label: string }[] = [
  { value: "avgGoalsPerGame", label: "Goals per game" },
  { value: "avgAssistsPerGame", label: "Assists per game" },
  { value: "avgToiPerGame", label: "TOI per game" },
  { value: "avgCorsiPct", label: "Corsi for %" },
  { value: "avgXgPer60", label: "xG per 60" },
];

function LeagueTrendsPage() {
  usePageTitle("League Trends");

  const navigate = useNavigate({ from: Route.fullPath });
  const { situation, metric } = Route.useSearch();

  const { data, isLoading, error, refetch } = useLeagueTrends(situation);

  const updateSearch = (
    updates: Partial<{ situation: string; metric: TrendMetric }>,
  ) => {
    navigate({ search: (prev) => ({ ...prev, ...updates }) });
  };

  const latestSeason = data?.seasons?.[data.seasons.length - 1];

  return (
    <div className="container space-y-6 py-8">
      <PageHeader
        title="League trends"
        description="How scoring, possession and ice time have changed across the league, season by season."
        actions={
          <>
            <Select
              value={situation}
              onValueChange={(v) => updateSearch({ situation: v })}
            >
              <SelectTrigger className="w-40" aria-label="Situation">
                <SelectValue placeholder="Situation" />
              </SelectTrigger>
              <SelectContent>
                {situationOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={metric}
              onValueChange={(v) => updateSearch({ metric: v as TrendMetric })}
            >
              <SelectTrigger className="w-44" aria-label="Metric">
                <SelectValue placeholder="Metric" />
              </SelectTrigger>
              <SelectContent>
                {metricOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-87.5" />
        </div>
      ) : data?.seasons && data.seasons.length > 0 ? (
        <div className="space-y-6">
          {latestSeason && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatTile
                label="Latest season"
                value={formatSeason(latestSeason.season)}
                note={`${latestSeason.totalPlayers.toLocaleString()} players`}
              />
              <StatTile
                label="Total goals"
                value={latestSeason.totalGoals.toLocaleString()}
                note={`${latestSeason.avgGoalsPerGame.toFixed(2)} per team-game`}
              />
              <StatTile
                label="Average TOI per game"
                value={formatToi(latestSeason.avgToiPerGame)}
                note="Per player"
              />
              <StatTile
                label="Average CF%"
                value={`${latestSeason.avgCorsiPct.toFixed(1)}%`}
                note="Ice time weighted"
              />
            </div>
          )}

          <LeagueTrendsChart data={data.seasons} metric={metric} />

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">
                Season-by-season data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium">
                        Season
                      </th>
                      <th className="text-right py-2 px-3 font-medium">
                        Players
                      </th>
                      <th className="text-right py-2 px-3 font-medium">GP</th>
                      <th className="text-right py-2 px-3 font-medium">
                        Goals
                      </th>
                      <th className="text-right py-2 px-3 font-medium">G/GP</th>
                      <th className="text-right py-2 px-3 font-medium">A/GP</th>
                      <th className="text-right py-2 px-3 font-medium">CF%</th>
                      <th className="text-right py-2 px-3 font-medium">
                        xG/60
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.seasons].reverse().map((s) => (
                      <tr
                        key={s.season}
                        className="border-b last:border-0 hover:bg-muted/50"
                      >
                        <td className="py-2 px-3 font-medium">
                          {formatSeason(s.season)}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          {s.totalPlayers.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          {s.totalGamesPlayed.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          {s.totalGoals.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          {s.avgGoalsPerGame.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          {s.avgAssistsPerGame.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          {s.avgCorsiPct.toFixed(1)}%
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          {s.avgXgPer60.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <EmptyState
          title="No trend data for this situation"
          hint="Pick another situation."
        />
      )}
    </div>
  );
}
