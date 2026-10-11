import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamLogo } from "@/components/team-detail/TeamLogo";
import type { Team } from "@/types";

interface TeamHeaderProps {
  team?: Team;
  abbrev: string;
  isLoading: boolean;
}

export function TeamHeader({ team, abbrev, isLoading }: TeamHeaderProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-6">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6">
      <TeamLogo abbrev={abbrev} name={team?.name ?? abbrev} />
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{team?.name}</h1>
          {team?.isActive === false && (
            <Badge variant="destructive">Inactive</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {team?.division && (
            <Badge variant="secondary">{team.division}</Badge>
          )}
          {team?.conference && (
            <span className="text-muted-foreground">
              {team.conference} Conference
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
