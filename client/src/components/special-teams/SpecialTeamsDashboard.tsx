import { useNavigate } from "@tanstack/react-router";
import { Calendar } from "lucide-react";
import { useTeamSpecialTeams, useTeamSeasons } from "@/hooks";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared";
import { PowerPlayCard } from "@/components/special-teams/PowerPlayCard";
import { PenaltyKillCard } from "@/components/special-teams/PenaltyKillCard";
import { SpecialTeamsPlayerTable } from "@/components/special-teams/SpecialTeamsPlayerTable";

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
      <div className="flex flex-wrap items-center gap-3">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <Select
          value={effectiveSeason?.toString() ?? ""}
          onValueChange={handleSeasonChange}
        >
          <SelectTrigger className="w-45">
            <SelectValue placeholder="Select season" />
          </SelectTrigger>
          <SelectContent>
            {seasons?.seasons.map((s) => (
              <SelectItem key={s.year} value={s.year.toString()}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {effectiveSeason && (
          <span className="text-sm text-muted-foreground">
            Showing {effectiveSeason}-{(effectiveSeason + 1).toString().slice(-2)} regular season
          </span>
        )}
      </div>

      {specialTeams && (
        <>
          <div className="grid md:grid-cols-2 gap-6">
            <PowerPlayCard stats={specialTeams.powerPlay} />
            <PenaltyKillCard stats={specialTeams.penaltyKill} />
          </div>

          <SpecialTeamsPlayerTable abbrev={abbrev} season={effectiveSeason} />
        </>
      )}

      {!specialTeams && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">No special teams data available.</p>
          <p className="text-sm mt-2">
            Try selecting a different season or run data ingestion.
          </p>
        </div>
      )}
    </div>
  );
}
