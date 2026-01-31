import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { z } from "zod";
import { Calendar, BarChart3, TableIcon } from "lucide-react";
import { useTeam, useTeamRoster, useTeamSeasons, usePageTitle } from "@/hooks";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorState, BackButton } from "@/components/shared";
import {
  TeamHeader,
  RosterTable,
  GoalieRosterTable,
  RosterSkeleton,
  RosterXGScatter,
  AgeDistributionChart,
  IceTimeDistributionChart,
  PointsContributionChart,
} from "@/components/team-detail";

const searchSchema = z.object({
  season: z.number().optional(),
  type: z.enum(["regular", "playoffs", "all"]).optional(),
  // Include all view values used by this route and child routes
  view: z.enum(["table", "charts", "explorer", "heatmaps"]).optional(),
});

export const Route = createFileRoute("/teams/$abbrev")({
  component: TeamDetailPage,
  validateSearch: searchSchema,
});

type SeasonType = "all" | "regular" | "playoffs";

function TeamDetailPage() {
  const { abbrev } = Route.useParams();
  const { season, type, view } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const location = useLocation();

  // Derive state from URL params
  const selectedSeason = season;
  const seasonType: SeasonType = type ?? "regular";
  const currentView = view ?? "table";

  const updateView = (newView: "table" | "charts") => {
    navigate({ search: (prev) => ({ ...prev, view: newView }) });
  };

  const {
    data: team,
    isLoading: teamLoading,
    error: teamError,
    refetch,
  } = useTeam(abbrev);
  const { data: seasons } = useTeamSeasons(abbrev);

  usePageTitle(team?.name);

  // Map seasonType to playoffs param: "regular" -> false, "playoffs" -> true, "all" -> undefined
  const playoffsParam =
    seasonType === "all" ? undefined : seasonType === "playoffs";
  const { data: roster, isLoading: rosterLoading } = useTeamRoster(
    abbrev,
    selectedSeason,
    playoffsParam,
  );

  // Check if we're on a child route
  const isOnChildRoute =
    location.pathname.includes("/lines") ||
    location.pathname.includes("/chemistry") ||
    location.pathname.includes("/shots") ||
    location.pathname.includes("/special-teams") ||
    location.pathname.includes("/builder");

  // Determine active tab based on route
  const getActiveTab = () => {
    if (location.pathname.includes("/lines")) return "lines";
    if (location.pathname.includes("/chemistry")) return "chemistry";
    if (location.pathname.includes("/shots")) return "shots";
    if (location.pathname.includes("/special-teams")) return "special-teams";
    if (location.pathname.includes("/builder")) return "builder";
    return "roster";
  };

  const handleSeasonChange = (value: string) => {
    const newSeason = value === "all" ? undefined : parseInt(value, 10);
    navigate({
      search: (prev) => ({
        ...prev,
        season: newSeason,
        // Reset type to regular when clearing season
        type: newSeason ? prev.type : undefined,
      }),
    });
  };

  const handleTypeChange = (value: string) => {
    navigate({
      search: (prev) => ({
        ...prev,
        type: value as SeasonType,
      }),
    });
  };

  if (teamError) {
    return (
      <div className="container py-8">
        <ErrorState
          title="Team not found"
          message={`Could not find team with abbreviation "${abbrev}". The team may not exist or the server may be unavailable.`}
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

  return (
    <div className="container py-8">
      <BackButton fallbackPath="/teams" label="Teams" />

      <div className="mb-6">
        <TeamHeader team={team} abbrev={abbrev} isLoading={teamLoading} />
      </div>

      <Tabs value={getActiveTab()} className="mb-8">
        <TabsList>
          <TabsTrigger value="roster" asChild>
            <Link
              to="/teams/$abbrev"
              params={{ abbrev }}
              search={{ season, type }}
            >
              Roster
            </Link>
          </TabsTrigger>
          <TabsTrigger value="lines" asChild>
            <Link
              to="/teams/$abbrev/lines"
              params={{ abbrev }}
              search={{ season }}
            >
              Lines
            </Link>
          </TabsTrigger>
          <TabsTrigger value="chemistry" asChild>
            <Link
              to="/teams/$abbrev/chemistry"
              params={{ abbrev }}
              search={{ season }}
            >
              Chemistry
            </Link>
          </TabsTrigger>
          <TabsTrigger value="shots" asChild>
            <Link
              to="/teams/$abbrev/shots"
              params={{ abbrev }}
              search={{ season }}
            >
              Shots
            </Link>
          </TabsTrigger>
          <TabsTrigger value="special-teams" asChild>
            <Link
              to="/teams/$abbrev/special-teams"
              params={{ abbrev }}
              search={{ season }}
            >
              Special Teams
            </Link>
          </TabsTrigger>
          <TabsTrigger value="builder" asChild>
            <Link
              to="/teams/$abbrev/builder"
              params={{ abbrev }}
              search={{ season }}
            >
              Builder
            </Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Outlet />

      {!isOnChildRoute && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select
                value={selectedSeason?.toString() ?? "all"}
                onValueChange={handleSeasonChange}
              >
                <SelectTrigger className="w-45">
                  <SelectValue placeholder="Select season" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Seasons</SelectItem>
                  {seasons?.seasons.map((s) => (
                    <SelectItem key={s.year} value={s.year.toString()}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedSeason && (
                <Select value={seasonType} onValueChange={handleTypeChange}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular Season</SelectItem>
                    <SelectItem value="playoffs">Playoffs</SelectItem>
                    <SelectItem value="all">Both</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {selectedSeason && (
                <span className="text-sm text-muted-foreground">
                  Showing players from {selectedSeason}-
                  {(selectedSeason + 1).toString().slice(-2)}
                  {seasonType === "regular" && " regular season"}
                  {seasonType === "playoffs" && " playoffs"}
                </span>
              )}
            </div>

            {selectedSeason && (
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <Button
                  variant={currentView === "charts" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => updateView("charts")}
                  className="gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  Charts
                </Button>
                <Button
                  variant={currentView === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => updateView("table")}
                  className="gap-2"
                >
                  <TableIcon className="h-4 w-4" />
                  Table
                </Button>
              </div>
            )}
          </div>

          {rosterLoading ? (
            <RosterSkeleton />
          ) : roster?.players.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">
                No roster data available
                {selectedSeason
                  ? ` for ${selectedSeason}-${(selectedSeason + 1).toString().slice(-2)}`
                  : ""}
                .
              </p>
              <p className="text-sm mt-2">
                {selectedSeason
                  ? "Try selecting a different season or 'All Seasons'."
                  : "Run the data ingestion to populate player data."}
              </p>
            </div>
          ) : currentView === "charts" && selectedSeason ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RosterXGScatter
                players={roster?.players ?? []}
                teamAbbrev={abbrev}
              />
              <AgeDistributionChart
                players={roster?.players ?? []}
                teamAbbrev={abbrev}
              />
              <IceTimeDistributionChart
                players={roster?.players ?? []}
                teamAbbrev={abbrev}
              />
              <PointsContributionChart
                players={roster?.players ?? []}
                teamAbbrev={abbrev}
              />
            </div>
          ) : (
            <>
              {forwards.length > 0 && (
                <RosterTable
                  title="Forwards"
                  players={forwards}
                  showStats={!!selectedSeason}
                />
              )}
              {defensemen.length > 0 && (
                <RosterTable
                  title="Defensemen"
                  players={defensemen}
                  showStats={!!selectedSeason}
                />
              )}
              {goalies.length > 0 && (
                <GoalieRosterTable
                  title="Goalies"
                  players={goalies}
                  showStats={!!selectedSeason}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
