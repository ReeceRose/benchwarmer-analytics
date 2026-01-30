import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTeams } from "@/hooks";

// Map database abbreviations to NHL logo CDN abbreviations
const TEAM_LOGO_MAP: Record<string, string> = {
  ANA: "ANA", ARI: "ARI", BOS: "BOS", BUF: "BUF", CGY: "CGY", CAR: "CAR",
  CHI: "CHI", COL: "COL", CBJ: "CBJ", DAL: "DAL", DET: "DET", EDM: "EDM",
  FLA: "FLA", LAK: "LAK", MIN: "MIN", MTL: "MTL", NSH: "NSH", NJD: "NJD",
  NYI: "NYI", NYR: "NYR", OTT: "OTT", PHI: "PHI", PIT: "PIT", SJS: "SJS",
  SEA: "SEA", STL: "STL", TBL: "TBL", TOR: "TOR", UTA: "UTA", VAN: "VAN",
  VGK: "VGK", WSH: "WSH", WPG: "WPG",
  "L.A": "LAK", "N.J": "NJD", "S.J": "SJS", "T.B": "TBL",
};

function getTeamLogoUrl(abbrev: string): string {
  const mapped = TEAM_LOGO_MAP[abbrev] ?? abbrev;
  return `https://assets.nhle.com/logos/nhl/svg/${mapped}_light.svg`;
}

interface TeamLogoProps {
  abbrev: string;
  name: string;
}

function TeamLogo({ abbrev, name }: TeamLogoProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
        <span className="text-[10px] font-bold text-muted-foreground">{abbrev}</span>
      </div>
    );
  }

  return (
    <img
      src={getTeamLogoUrl(abbrev)}
      alt={`${name} logo`}
      className="w-10 h-10 object-contain group-hover:scale-110 transition-transform"
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
}

const DIVISIONS: Record<string, string[]> = {
  Atlantic: ["BOS", "BUF", "DET", "FLA", "MTL", "OTT", "TBL", "TOR"],
  Metropolitan: ["CAR", "CBJ", "NJD", "NYI", "NYR", "PHI", "PIT", "WSH"],
  Central: ["ARI", "CHI", "COL", "DAL", "MIN", "NSH", "STL", "WPG", "UTA"],
  Pacific: ["ANA", "CGY", "EDM", "LAK", "SEA", "SJS", "VAN", "VGK"],
};

export function TeamGrid() {
  const { data, isLoading } = useTeams();
  const teams = data?.teams ?? [];

  // Create a lookup for teams by abbreviation
  const teamLookup = new Map(teams.filter(t => t.isActive).map((t) => [t.abbreviation, t]));

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Browse by Team</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 32 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-12 rounded-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Browse by Team</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {Object.entries(DIVISIONS).map(([division, abbrevs]) => (
            <div key={division}>
              <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                {division}
              </h3>
              <div className="flex flex-wrap gap-2">
                {abbrevs.map((abbrev) => {
                  const team = teamLookup.get(abbrev);
                  if (!team) return null;
                  return (
                    <Link
                      key={abbrev}
                      to="/teams/$abbrev"
                      params={{ abbrev }}
                      className="group flex items-center justify-center p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      title={team.name}
                    >
                      <TeamLogo abbrev={abbrev} name={team.name} />
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
