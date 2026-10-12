import { Link } from "@tanstack/react-router";
import { TeamLogo } from "@/components/team-detail/TeamLogo";
import { getTeamName } from "@/lib/team-names";
import { cn } from "@/lib/utils";

/** Logo + abbreviation link for team columns in dense tables. */
export function TeamTag({
  abbrev,
  season,
  className,
}: {
  abbrev: string;
  season?: number;
  className?: string;
}) {
  return (
    <Link
      to="/teams/$abbrev"
      params={{ abbrev }}
      search={{ season }}
      title={getTeamName(abbrev)}
      className={cn(
        "inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      <TeamLogo abbrev={abbrev} size="sm" />
      {abbrev}
    </Link>
  );
}
