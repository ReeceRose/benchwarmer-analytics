import { useState } from "react";
import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useTeam, useTeamRoster, useTeamSeasons } from "@/hooks";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, BackButton } from "@/components/shared";
import { formatPosition, formatHeight, formatWeight } from "@/lib/formatters";
import { Calendar } from "lucide-react";
import type { RosterPlayer } from "@/types/player";

const searchSchema = z.object({
  season: z.number().optional(),
  type: z.enum(["regular", "playoffs", "all"]).optional(),
});

export const Route = createFileRoute("/teams/$abbrev")({
  component: TeamDetailPage,
  validateSearch: searchSchema,
});

// Map database abbreviations to NHL logo CDN abbreviations
const TEAM_LOGO_MAP: Record<string, string> = {
  "L.A": "LAK",
  "N.J": "NJD",
  "S.J": "SJS",
  "T.B": "TBL",
};

function getTeamLogoUrl(abbrev: string): string {
  const mapped = TEAM_LOGO_MAP[abbrev] ?? abbrev;
  return `https://assets.nhle.com/logos/nhl/svg/${mapped}_light.svg`;
}

function TeamLogo({ abbrev, name }: { abbrev: string; name: string }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
        <span className="text-lg font-bold text-muted-foreground">{abbrev}</span>
      </div>
    );
  }

  return (
    <img
      src={getTeamLogoUrl(abbrev)}
      alt={`${name} logo`}
      className="w-20 h-20 object-contain"
      onError={() => setHasError(true)}
    />
  );
}

type SeasonType = "all" | "regular" | "playoffs";

function TeamDetailPage() {
  const { abbrev } = Route.useParams();
  const { season, type } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const location = useLocation();

  // Derive state from URL params
  const selectedSeason = season;
  const seasonType: SeasonType = type ?? "regular";

  const { data: team, isLoading: teamLoading, error: teamError, refetch } = useTeam(abbrev);
  const { data: seasons } = useTeamSeasons(abbrev);

  // Map seasonType to playoffs param: "regular" -> false, "playoffs" -> true, "all" -> undefined
  const playoffsParam = seasonType === "all" ? undefined : seasonType === "playoffs";
  const { data: roster, isLoading: rosterLoading } = useTeamRoster(abbrev, selectedSeason, playoffsParam);

  // Check if we're on a child route
  const isOnChildRoute =
    location.pathname.includes("/lines") ||
    location.pathname.includes("/chemistry") ||
    location.pathname.includes("/shots");

  // Determine active tab based on route
  const getActiveTab = () => {
    if (location.pathname.includes("/lines")) return "lines";
    if (location.pathname.includes("/chemistry")) return "chemistry";
    if (location.pathname.includes("/shots")) return "shots";
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
  const forwards = roster?.players.filter((p) => p.position && ["C", "L", "R", "LW", "RW", "F"].includes(p.position)) ?? [];
  const defensemen = roster?.players.filter((p) => p.position === "D") ?? [];
  const goalies = roster?.players.filter((p) => p.position === "G") ?? [];

  return (
    <div className="container py-8">
      <BackButton fallbackPath="/teams" label="Teams" />

      {/* Team Header */}
      <div className="mb-6">
        {teamLoading ? (
          <div className="flex items-center gap-6">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
        ) : (
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
        )}
      </div>

      {/* Tabs */}
      <Tabs value={getActiveTab()} className="mb-8">
        <TabsList>
          <TabsTrigger value="roster" asChild>
            <Link to="/teams/$abbrev" params={{ abbrev }} search={{ season, type }}>
              Roster
            </Link>
          </TabsTrigger>
          <TabsTrigger value="lines" asChild>
            <Link to="/teams/$abbrev/lines" params={{ abbrev }} search={{ season }}>
              Lines
            </Link>
          </TabsTrigger>
          <TabsTrigger value="chemistry" asChild>
            <Link to="/teams/$abbrev/chemistry" params={{ abbrev }} search={{ season }}>
              Chemistry
            </Link>
          </TabsTrigger>
          <TabsTrigger value="shots" asChild>
            <Link to="/teams/$abbrev/shots" params={{ abbrev }} search={{ season }}>
              Shots
            </Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Child route content */}
      <Outlet />

      {/* Roster - only show if we're on the base route */}
      {!isOnChildRoute && (
        <div className="space-y-6">
          {/* Filters */}
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
              <Select
                value={seasonType}
                onValueChange={handleTypeChange}
              >
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
                Showing players from {selectedSeason}-{(selectedSeason + 1).toString().slice(-2)}
                {seasonType === "regular" && " regular season"}
                {seasonType === "playoffs" && " playoffs"}
              </span>
            )}
          </div>

          {rosterLoading ? (
            <div className="rounded-md border p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : roster?.players.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">No roster data available{selectedSeason ? ` for ${selectedSeason}-${(selectedSeason + 1).toString().slice(-2)}` : ""}.</p>
              <p className="text-sm mt-2">
                {selectedSeason
                  ? "Try selecting a different season or 'All Seasons'."
                  : "Run the data ingestion to populate player data."}
              </p>
            </div>
          ) : (
            <>
              {/* Forwards */}
              {forwards.length > 0 && (
                <RosterSection title="Forwards" players={forwards} showStats={!!selectedSeason} />
              )}

              {/* Defensemen */}
              {defensemen.length > 0 && (
                <RosterSection title="Defensemen" players={defensemen} showStats={!!selectedSeason} />
              )}

              {/* Goalies - note: goalies don't have skater stats */}
              {goalies.length > 0 && (
                <RosterSection title="Goalies" players={goalies} showStats={false} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function formatToi(seconds?: number): string {
  if (!seconds) return "-";
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function formatPct(value?: number): string {
  if (value === undefined || value === null) return "-";
  return `${(value * 100).toFixed(1)}%`;
}

interface RosterSectionProps {
  title: string;
  players: RosterPlayer[];
  showStats?: boolean;
}

function RosterSection({ title, players, showStats = false }: RosterSectionProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={showStats ? "w-[25%]" : "w-[40%]"}>Name</TableHead>
              <TableHead>Pos</TableHead>
              {showStats ? (
                <>
                  <TableHead className="text-right">GP</TableHead>
                  <TableHead className="text-right">TOI</TableHead>
                  <TableHead className="text-right">G</TableHead>
                  <TableHead className="text-right">A</TableHead>
                  <TableHead className="text-right">P</TableHead>
                  <TableHead className="text-right">S</TableHead>
                  <TableHead className="text-right">xG</TableHead>
                  <TableHead className="text-right">CF%</TableHead>
                </>
              ) : (
                <>
                  <TableHead>Height</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Shoots</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {players.map((player) => (
              <TableRow key={player.id}>
                <TableCell>
                  <Link
                    to="/players/$id"
                    params={{ id: String(player.id) }}
                    className="hover:underline font-medium"
                  >
                    {player.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-normal">
                    {formatPosition(player.position)}
                  </Badge>
                </TableCell>
                {showStats ? (
                  <>
                    <TableCell className="text-right tabular-nums">{player.gamesPlayed ?? "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatToi(player.iceTimeSeconds)}</TableCell>
                    <TableCell className="text-right tabular-nums">{player.goals ?? "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">{player.assists ?? "-"}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{player.points ?? "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">{player.shots ?? "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">{player.expectedGoals?.toFixed(1) ?? "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPct(player.corsiForPct)}</TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="text-muted-foreground">
                      {formatHeight(player.heightInches)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatWeight(player.weightLbs)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {player.shoots || "-"}
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
