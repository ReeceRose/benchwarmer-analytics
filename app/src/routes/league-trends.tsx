import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TrendingUp, Filter, BarChart3 } from "lucide-react";
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
  { value: "all", label: "All Situations" },
  { value: "5on5", label: "5-on-5" },
  { value: "5on4", label: "Power Play (5v4)" },
  { value: "4on5", label: "Penalty Kill (4v5)" },
];

const metricOptions: { value: TrendMetric; label: string }[] = [
  { value: "avgGoalsPerGame", label: "Goals per Game" },
  { value: "avgAssistsPerGame", label: "Assists per Game" },
  { value: "avgToiPerGame", label: "TOI per Game" },
  { value: "avgCorsiPct", label: "Corsi For %" },
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
    <div className="container py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">League Trends</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl">
          Track how league-wide statistics have changed across seasons. See
          trends in scoring, possession metrics, and player performance over
          time.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={situation}
            onValueChange={(v) => updateSearch({ situation: v })}
          >
            <SelectTrigger className="w-40 h-9">
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
        </div>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <Select
            value={metric}
            onValueChange={(v) => updateSearch({ metric: v as TrendMetric })}
          >
            <SelectTrigger className="w-44 h-9">
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
        </div>
      </div>

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
              <SummaryCard
                title="Latest Season"
                value={formatSeason(latestSeason.season)}
                subtitle={`${latestSeason.totalPlayers.toLocaleString()} players`}
              />
              <SummaryCard
                title="Total Goals"
                value={latestSeason.totalGoals.toLocaleString()}
                subtitle={`${latestSeason.avgGoalsPerGame.toFixed(2)} per team-game`}
              />
              <SummaryCard
                title="Avg TOI/Game"
                value={formatToi(latestSeason.avgToiPerGame)}
                subtitle="Per player"
              />
              <SummaryCard
                title="Avg CF%"
                value={`${latestSeason.avgCorsiPct.toFixed(1)}%`}
                subtitle="Ice time weighted"
              />
            </div>
          )}

          <LeagueTrendsChart data={data.seasons} metric={metric} />

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">
                Season-by-Season Data
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
        <Card>
          <CardContent className="py-12 text-center">
            <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium">No trend data available</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try selecting a different situation filter.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
