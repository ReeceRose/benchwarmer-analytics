import { useState } from "react";

// Map database abbreviations to NHL logo CDN abbreviations
// Logo URL format: https://assets.nhle.com/logos/nhl/svg/{abbrev}_light.svg
const TEAM_LOGO_MAP: Record<string, string> = {
  // Active teams
  ANA: "ANA",
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
  // Historical teams (relocated/defunct)
  ARI: "ARI", // Arizona Coyotes → Utah Hockey Club (2024)
  ATL: "ATL", // Atlanta Thrashers → Winnipeg Jets (2011)
};

function getTeamLogoUrl(abbrev: string): string {
  const mapped = TEAM_LOGO_MAP[abbrev] ?? abbrev;
  return `https://assets.nhle.com/logos/nhl/svg/${mapped}_light.svg`;
}

type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_CLASSES: Record<LogoSize, string> = {
  xs: "w-4 h-4",
  sm: "w-5 h-5",
  md: "w-6 h-6",
  lg: "w-16 h-16",
  xl: "w-20 h-20",
};

const FALLBACK_SIZE_CLASSES: Record<LogoSize, string> = {
  xs: "w-4 h-4 text-[8px]",
  sm: "w-5 h-5 text-[9px]",
  md: "w-6 h-6 text-[10px]",
  lg: "w-16 h-16 text-sm",
  xl: "w-20 h-20 text-lg",
};

interface TeamLogoProps {
  abbrev: string;
  name?: string;
  size?: LogoSize;
  className?: string;
}

export function TeamLogo({ abbrev, name, size = "xl", className = "" }: TeamLogoProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className={`${FALLBACK_SIZE_CLASSES[size]} rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground shrink-0 ${className}`}
      >
        {abbrev.slice(0, 3)}
      </div>
    );
  }

  return (
    <img
      src={getTeamLogoUrl(abbrev)}
      alt={name ? `${name} logo` : abbrev}
      className={`${SIZE_CLASSES[size]} object-contain shrink-0 ${className}`}
      onError={() => setHasError(true)}
    />
  );
}
