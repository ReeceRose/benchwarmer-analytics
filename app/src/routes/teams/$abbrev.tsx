import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import * as z from "zod/mini";
import {
  useTeam,
  useTeamRoster,
  useTeamSeasons,
  usePageTitle,
  useCategoryRankings,
  useOfficialStandings,
  teamSeasonsQueryOptions,
} from "@/hooks";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorState } from "@/components/shared";
import {
  EntityHeroSkeleton,
  PageTabs,
  SegmentedControl,
  pageTabClass,
} from "@/components/layout";
import { getTeamName } from "@/lib/team-names";
import { formatSeason } from "@/lib/formatters";
import {
  TeamHero,
  RosterTable,
  GoalieRosterTable,
  RosterSkeleton,
  RosterXGScatter,
  AgeDistributionChart,
  IceTimeDistributionChart,
  PointsContributionChart,
} from "@/components/team-detail";

const searchSchema = z.object({
  season: z.optional(z.number()),
  type: z.optional(z.enum(["regular", "playoffs", "all"])),
  // Include all view values used by this route and child routes
  view: z.optional(z.enum(["table", "charts", "explorer", "heatmaps"])),
});

export const Route = createFileRoute("/teams/$abbrev")({
  component: TeamDetailPage,
  loader: ({ context, params }) =>
    context.queryClient.prefetchQuery(teamSeasonsQueryOptions(params.abbrev)),
  validateSearch: searchSchema,
});

type SeasonType = "all" | "regular" | "playoffs";

function TeamDetailPage() {
  const { abbrev } = Route.useParams();
  const { season, type, view } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const location = useLocation();

  const { data: seasons } = useTeamSeasons(abbrev);
  const latestSeason = seasons?.seasons[0]?.year;

  // The roster defaults to the team's latest season.
  const selectedSeason = season ?? latestSeason;
  const seasonType: SeasonType = type ?? "regular";
  // `view` is shared with child routes; the roster only has table and charts.
  const currentView = view === "charts" ? "charts" : "table";

  const updateView = (newView: "table" | "charts") => {
    navigate({ search: (prev) => ({ ...prev, view: newView }) });
  };

  const {
    data: team,
    isLoading: teamLoading,
    error: teamError,
    refetch,
  } = useTeam(abbrev);
  usePageTitle(getTeamName(abbrev));

  // Official standings are only available for the current season.
  const { data: standingsData } = useOfficialStandings();
  const standings =
    selectedSeason === latestSeason
      ? standingsData?.teams.find((t) => t.abbreviation === abbrev)
      : undefined;

  // Map seasonType to playoffs param: "regular" -> false, "playoffs" -> true, "all" -> undefined
  const playoffsParam =
    seasonType === "all" ? undefined : seasonType === "playoffs";
  const { data: roster, isLoading: rosterLoading } = useTeamRoster(
    abbrev,
    selectedSeason,
    playoffsParam,
  );

  const { data: categoryRankings } = useCategoryRankings(
    selectedSeason,
    abbrev,
  );

  // Check if we're on a child route
  const isOnChildRoute =
    location.pathname.includes("/lines") ||
    location.pathname.includes("/chemistry") ||
    location.pathname.includes("/shots") ||
    location.pathname.includes("/special-teams") ||
    location.pathname.includes("/score-state") ||
    location.pathname.includes("/builder");

  const handleSeasonChange = (value: string) => {
    navigate({
      search: (prev) => ({ ...prev, season: parseInt(value, 10) }),
    });
  };

  const handleTypeChange = (value: SeasonType) => {
    navigate({
      search: (prev) => ({
        ...prev,
        type: value,
      }),
    });
  };

  if (teamError) {
    return (
      <div className="container py-8">
        <ErrorState
          title="Team not found"
          message={`There's no team with the abbreviation "${abbrev}", or the stats service is unavailable.`}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  // Group roster by position
  const forwards =
    roster?.players.filter(
      (p) =>
        p.position && ["C", "L", "R", "LW", "RW", "F"].includes(p.position),
    ) ?? [];
  const defensemen = roster?.players.filter((p) => p.position === "D") ?? [];
  const goalies = roster?.players.filter((p) => p.position === "G") ?? [];

  const tabs = [
    { to: "/teams/$abbrev", label: "Roster" },
    { to: "/teams/$abbrev/lines", label: "Lines" },
    { to: "/teams/$abbrev/chemistry", label: "Chemistry" },
    { to: "/teams/$abbrev/shots", label: "Shots" },
    { to: "/teams/$abbrev/special-teams", label: "Special teams" },
    { to: "/teams/$abbrev/score-state", label: "Score state" },
    { to: "/teams/$abbrev/builder", label: "Line builder" },
  ] as const;

  return (
    <>
      {teamLoading ? (
        <EntityHeroSkeleton />
      ) : (
        <TeamHero
          abbrev={abbrev}
          team={team}
          season={selectedSeason}
          standings={standings}
          ranks={categoryRankings?.teams[0]}
        />
      )}

      <PageTabs aria-label="Team sections">
        {tabs.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            params={{ abbrev }}
            search={{ season }}
            activeOptions={{ exact: true, includeSearch: false }}
            className={pageTabClass}
            resetScroll={false}
          >
            {tab.label}
          </Link>
        ))}
      </PageTabs>

      <div className="container py-8">
        <Outlet />

        {!isOnChildRoute && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={selectedSeason?.toString()}
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
                <SegmentedControl
                  aria-label="Season type"
                  value={seasonType}
                  onValueChange={handleTypeChange}
                  options={[
                    { value: "regular", label: "Regular season" },
                    { value: "playoffs", label: "Playoffs" },
                    { value: "all", label: "Both" },
                  ]}
                />
              </div>
              <SegmentedControl
                aria-label="View"
                value={currentView}
                onValueChange={updateView}
                options={[
                  { value: "table", label: "Table" },
                  { value: "charts", label: "Charts" },
                ]}
              />
            </div>

            {rosterLoading || !roster ? (
              <RosterSkeleton />
            ) : roster.players.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">
                No players recorded for this team
                {selectedSeason ? ` in ${formatSeason(selectedSeason)}` : ""}.
                Try another season.
              </p>
            ) : currentView === "charts" ? (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <RosterXGScatter players={roster.players} teamAbbrev={abbrev} />
                <AgeDistributionChart players={roster.players} teamAbbrev={abbrev} />
                <IceTimeDistributionChart
                  players={roster.players}
                  teamAbbrev={abbrev}
                />
                <PointsContributionChart
                  players={roster.players}
                  teamAbbrev={abbrev}
                />
              </div>
            ) : (
              <div className="space-y-8">
                {forwards.length > 0 && (
                  <RosterTable title="Forwards" players={forwards} showStats />
                )}
                {defensemen.length > 0 && (
                  <RosterTable title="Defense" players={defensemen} showStats />
                )}
                {goalies.length > 0 && (
                  <GoalieRosterTable title="Goalies" players={goalies} showStats />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
