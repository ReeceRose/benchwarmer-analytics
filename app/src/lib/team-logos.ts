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

/**
 * `light` logos are drawn for light backgrounds, `dark` logos for dark ones
 * (team-coloured headers, the scores strip). Without a variant the logo
 * matches the page theme at call time; components that must follow theme
 * toggles live should pass `resolvedTheme` from useTheme().
 */
export function getTeamLogoUrl(
  abbrev: string,
  variant?: "light" | "dark",
): string {
  const resolved =
    variant ??
    (typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark")
      ? "dark"
      : "light");
  return `https://assets.nhle.com/logos/nhl/svg/${getTeamLogoFile(abbrev, resolved)}`;
}

/** The logo's file name, e.g. "EDM_dark.svg". */
export function getTeamLogoFile(abbrev: string, variant: "light" | "dark"): string {
  return `${TEAM_LOGO_MAP[abbrev] ?? abbrev}_${variant}.svg`;
}

/**
 * The same logo served from our origin (`/api/logos`), for markup that gets
 * drawn to a canvas: the NHL's asset host doesn't send CORS headers.
 */
export function getSameOriginTeamLogoUrl(abbrev: string, variant: "light" | "dark"): string {
  return `/api/logos/${getTeamLogoFile(abbrev, variant)}`;
}
