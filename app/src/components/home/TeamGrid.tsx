import { Link } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { Panel, Section } from "@/components/layout";
import { TeamLogo } from "@/components/team-detail/TeamLogo";
import { useTeams } from "@/hooks";
import { getTeamName } from "@/lib/team-names";

const DIVISION_ORDER = ["Atlantic", "Metropolitan", "Central", "Pacific"];

export function TeamGrid() {
  const { data, isLoading } = useTeams();
  const active = (data?.teams ?? []).filter((t) => t.isActive);

  return (
    <Section
      title="Browse teams"
      action={
        <Link to="/standings" className="font-semibold text-link hover:underline">
          Standings
        </Link>
      }
    >
      <Panel>
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
          {DIVISION_ORDER.map((division) => {
            const teams = active
              .filter((t) => t.division === division)
              .sort((a, b) => a.abbreviation.localeCompare(b.abbreviation));
            return (
              <div key={division}>
                <h3 className="mb-1.5 font-sans text-xs font-semibold text-muted-foreground">
                  {division}
                </h3>
                {isLoading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="my-2 h-5 w-20" />
                    ))
                  : teams.map((team) => (
                      <Link
                        key={team.abbreviation}
                        to="/teams/$abbrev"
                        params={{ abbrev: team.abbreviation }}
                        title={getTeamName(team.abbreviation)}
                        className="-mx-1.5 flex items-center gap-2 rounded-lg px-1.5 py-1 text-sm transition-colors hover:bg-accent"
                      >
                        <TeamLogo abbrev={team.abbreviation} size="md" />
                        {team.abbreviation}
                      </Link>
                    ))}
              </div>
            );
          })}
        </div>
      </Panel>
    </Section>
  );
}
