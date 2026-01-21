import { useState } from "react";

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

interface TeamLogoProps {
  abbrev: string;
  name: string;
}

export function TeamLogo({ abbrev, name }: TeamLogoProps) {
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
