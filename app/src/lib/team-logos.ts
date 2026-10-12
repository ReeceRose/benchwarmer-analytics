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

export function getTeamLogoUrl(abbrev: string): string {
  const mapped = TEAM_LOGO_MAP[abbrev] ?? abbrev;
  return `https://assets.nhle.com/logos/nhl/svg/${mapped}_light.svg`;
}
