import { createFileRoute, Link } from "@tanstack/react-router";
import { useOfficialStandings, useTeams, usePageTitle } from "@/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, TeamLogo } from "@/components/shared";
import { EmptyState, PageHeader, Section } from "@/components/layout";
import { formatOrdinal } from "@/lib/formatters";
import { getTeamColours } from "@/lib/team-colours";
import type { OfficialStandings, Team } from "@/types";

export const Route = createFileRoute("/teams/")({
  component: TeamsPage,
});

const DIVISIONS = [
  { name: "Atlantic", conference: "Eastern" },
  { name: "Metropolitan", conference: "Eastern" },
  { name: "Central", conference: "Western" },
  { name: "Pacific", conference: "Western" },
];

function TeamsPage() {
  usePageTitle("Teams");

  const { data, isLoading, error, refetch } = useTeams();
  const { data: standingsData } = useOfficialStandings();

  if (error) {
    return (
      <div className="container py-8">
        <ErrorState
          title="Couldn't load teams"
          message="The teams request failed."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const teams = data?.teams ?? [];
  const standings = new Map(
    (standingsData?.teams ?? []).map((t) => [t.abbreviation, t]),
  );
  const active = teams.filter((t) => t.isActive);
  const historical = teams.filter((t) => !t.isActive);

  return (
    <div className="container space-y-10 py-8">
      <PageHeader
        title="Teams"
        description="Every NHL team by division, with this season's record."
      />

      {isLoading ? (
        <div className="grid gap-x-6 gap-y-10 lg:grid-cols-2">
          {DIVISIONS.map((d) => (
            <div key={d.name} className="space-y-3">
              <Skeleton className="h-6 w-32" />
              <div className="grid gap-2 sm:grid-cols-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-2xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : active.length === 0 ? (
        <EmptyState
          title="No teams yet"
          hint="Teams appear after the first data import."
        />
      ) : (
        <div className="grid gap-x-6 gap-y-10 lg:grid-cols-2">
          {DIVISIONS.map((division) => {
            const divisionTeams = active
              .filter((t) => t.division === division.name)
              .sort((a, b) => {
                const ra = standings.get(a.abbreviation)?.divisionRank ?? 99;
                const rb = standings.get(b.abbreviation)?.divisionRank ?? 99;
                return ra - rb || a.name.localeCompare(b.name);
              });
            return (
              <Section
                key={division.name}
                title={division.name}
                description={`${division.conference} Conference`}
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  {divisionTeams.map((team) => (
                    <TeamCard
                      key={team.abbreviation}
                      team={team}
                      standings={standings.get(team.abbreviation)}
                    />
                  ))}
                </div>
              </Section>
            );
          })}
        </div>
      )}

      {historical.length > 0 && (
        <Section
          title="Former franchises"
          description="Relocated teams, kept for their historical seasons."
        >
          <div className="flex flex-wrap gap-2">
            {historical.map((team) => (
              <Link
                key={team.abbreviation}
                to="/teams/$abbrev"
                params={{ abbrev: team.abbreviation }}
                className="flex items-center gap-2 rounded-full border bg-card py-1.5 pr-3.5 pl-2 text-sm transition-colors hover:bg-accent"
              >
                <TeamLogo abbrev={team.abbreviation} size="sm" />
                {team.name}
              </Link>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function TeamCard({
  team,
  standings,
}: {
  team: Team;
  standings?: OfficialStandings;
}) {
  const colours = getTeamColours(team.abbreviation);

  return (
    <Link
      to="/teams/$abbrev"
      params={{ abbrev: team.abbreviation }}
      className="group flex items-center gap-3 overflow-hidden rounded-2xl border bg-card pr-4 transition-colors hover:border-primary/40"
    >
      <span
        className="flex size-16 shrink-0 items-center justify-center"
        style={{ backgroundColor: colours.primary }}
      >
        <TeamLogo abbrev={team.abbreviation} variant="dark" size="lg" className="size-10" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium group-hover:text-link">
          {team.name}
        </span>
        {standings && (
          <span className="block text-xs text-muted-foreground tabular-nums">
            {standings.wins}–{standings.losses}–{standings.otLosses},{" "}
            {standings.points} pts
          </span>
        )}
      </span>
      {standings?.divisionRank && (
        <span className="text-sm font-semibold text-muted-foreground">
          {formatOrdinal(standings.divisionRank)}
        </span>
      )}
    </Link>
  );
}
