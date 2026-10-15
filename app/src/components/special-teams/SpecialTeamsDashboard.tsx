import { useNavigate } from "@tanstack/react-router";
import {
  useTeamSpecialTeams,
  useTeamSeasons,
  useSpecialTeamsTrend,
  useTeamHomeAway,
} from "@/hooks";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared";
import { PowerPlayCard } from "@/components/special-teams/PowerPlayCard";
import { PenaltyKillCard } from "@/components/special-teams/PenaltyKillCard";
import { PenaltiesCard } from "@/components/special-teams/PenaltiesCard";
import { SpecialTeamsPlayerTable } from "@/components/special-teams/SpecialTeamsPlayerTable";
import {
  GoalsVsXGChart,
  SpecialTeamsTrendChart,
} from "@/components/special-teams/charts";
import { EmptyState } from "@/components/layout";

interface SpecialTeamsDashboardProps {
  abbrev: string;
  season?: number;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}

export function SpecialTeamsDashboard({
  abbrev,
  season,
}: SpecialTeamsDashboardProps) {
  const navigate = useNavigate();
  const { data: seasons, isLoading: seasonsLoading } = useTeamSeasons(abbrev);

  // Use the most recent season with data if no season is specified
  const effectiveSeason = season ?? seasons?.seasons[0]?.year;

  const {
    data: specialTeams,
    isLoading,
    error,
    refetch,
  } = useTeamSpecialTeams(abbrev, effectiveSeason, false);

  const { data: homeAway } = useTeamHomeAway(abbrev.toUpperCase(), effectiveSeason);

  const { data: trendData, isLoading: trendLoading } = useSpecialTeamsTrend(
    abbrev,
    effectiveSeason,
    false,
  );

  const handleSeasonChange = (value: string) => {
    const newSeason = value === "all" ? undefined : parseInt(value, 10);
    navigate({
      to: "/teams/$abbrev/special-teams",
      params: { abbrev },
      search: { season: newSeason },
    });
  };

  if (isLoading || seasonsLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load special teams"
        message="Unable to load special teams data. Please try again."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Special teams</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Power play and penalty kill, regular season.
          </p>
        </div>
        <Select
          value={effectiveSeason?.toString() ?? ""}
          onValueChange={handleSeasonChange}
        >
          <SelectTrigger className="w-32" aria-label="Season">
            <SelectValue placeholder="Season" />
          </SelectTrigger>
          <SelectContent>
            {seasons?.seasons.map((s) => (
              <SelectItem key={s.year} value={s.year.toString()}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {specialTeams && (
        <>
          <div className="grid md:grid-cols-2 gap-6">
            <PowerPlayCard stats={specialTeams.powerPlay} />
            <PenaltyKillCard stats={specialTeams.penaltyKill} />
          </div>

          {specialTeams.penalties && <PenaltiesCard stats={specialTeams.penalties} homeAway={homeAway} abbrev={abbrev} />}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Performance analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <GoalsVsXGChart
                powerPlay={specialTeams.powerPlay}
                penaltyKill={specialTeams.penaltyKill}
              />
              <SpecialTeamsTrendChart
                games={trendData?.games ?? []}
                isLoading={trendLoading}
              />
            </CardContent>
          </Card>

          <SpecialTeamsPlayerTable abbrev={abbrev} season={effectiveSeason} />
        </>
      )}

      {!specialTeams && !isLoading && (
        <EmptyState
          title="No special teams data for this season"
          hint="Try another season."
        />
      )}
    </div>
  );
}
