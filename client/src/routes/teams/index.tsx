import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTeams } from "@/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/shared";

// Map database abbreviations to NHL logo CDN abbreviations
// Logo URL format: https://assets.nhle.com/logos/nhl/svg/{abbrev}_light.svg
const TEAM_LOGO_MAP: Record<string, string> = {
  // Standard mappings
  ANA: "ANA",
  ARI: "ARI",
  BOS: "BOS",
  BUF: "BUF",
  CGY: "CGY",
  CAR: "CAR",
  CHI: "CHI",
  COL: "COL",
  CBJ: "CBJ",
  DAL: "DAL",
  DET: "DET",
  EDM: "EDM",
  FLA: "FLA",
  LAK: "LAK",
  MIN: "MIN",
  MTL: "MTL",
  NSH: "NSH",
  NJD: "NJD",
  NYI: "NYI",
  NYR: "NYR",
  OTT: "OTT",
  PHI: "PHI",
  PIT: "PIT",
  SJS: "SJS",
  SEA: "SEA",
  STL: "STL",
  TBL: "TBL",
  TOR: "TOR",
  UTA: "UTA",
  VAN: "VAN",
  VGK: "VGK",
  WSH: "WSH",
  WPG: "WPG",
  // MoneyPuck uses periods in some abbreviations
  "L.A": "LAK",
  "N.J": "NJD",
  "S.J": "SJS",
  "T.B": "TBL",
  // Historical teams
  ATL: "ATL",
};

function getTeamLogoUrl(abbrev: string): string {
  const mapped = TEAM_LOGO_MAP[abbrev] ?? abbrev;
  return `https://assets.nhle.com/logos/nhl/svg/${mapped}_light.svg`;
}

function TeamLogo({ abbrev, name, isActive }: { abbrev: string; name: string; isActive: boolean }) {
  const [hasError, setHasError] = useState(false);

  // For inactive teams, skip loading the logo since it won't exist
  if (hasError || !isActive) {
    // Fallback: show abbreviation in a circle
    return (
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
        <span className="text-sm font-bold text-muted-foreground">{abbrev}</span>
      </div>
    );
  }

  return (
    <img
      src={getTeamLogoUrl(abbrev)}
      alt={`${name} logo`}
      className="w-16 h-16 object-contain group-hover:scale-110 transition-transform"
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
}

export const Route = createFileRoute("/teams/")({
  component: TeamsPage,
});

function TeamsPage() {
  const { data, isLoading, error, refetch } = useTeams();

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Teams</h1>
        <ErrorState
          title="Failed to load teams"
          message="Could not fetch team data from the server. Make sure the API is running."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  // Teams are already sorted by the API (active first, then alphabetically)
  const teams = data?.teams ?? [];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Teams</h1>

      {isLoading ? (
        <div className="grid gap-6 grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {Array.from({ length: 32 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <Skeleton className="w-16 h-16 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">No teams found.</p>
          <p className="text-sm text-muted-foreground mt-2">
            The database may not be seeded yet. Run the data ingestion to populate teams.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {teams.map((team) => (
            <Link
              key={team.id}
              to="/teams/$abbrev"
              params={{ abbrev: team.abbreviation }}
              className={`group flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted/50 transition-colors ${!team.isActive ? "opacity-60" : ""}`}
            >
              <TeamLogo abbrev={team.abbreviation} name={team.name} isActive={team.isActive} />
              <span className="text-sm font-medium text-center">
                {team.name}
              </span>
              {!team.isActive && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  Inactive
                </Badge>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
