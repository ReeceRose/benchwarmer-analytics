/**
 * Full team names by abbreviation. MoneyPuck's teams.csv has no team names,
 * so ingestion fills teams.name from here; the UI uses it where it only has
 * an abbreviation (scores strip, leaderboards). Relocated franchises keep the
 * name they last played under.
 */
export const TEAM_NAMES: Record<string, string> = {
  ANA: "Anaheim Ducks",
  ARI: "Arizona Coyotes",
  ATL: "Atlanta Thrashers",
  BOS: "Boston Bruins",
  BUF: "Buffalo Sabres",
  CAR: "Carolina Hurricanes",
  CBJ: "Columbus Blue Jackets",
  CGY: "Calgary Flames",
  CHI: "Chicago Blackhawks",
  COL: "Colorado Avalanche",
  DAL: "Dallas Stars",
  DET: "Detroit Red Wings",
  EDM: "Edmonton Oilers",
  FLA: "Florida Panthers",
  LAK: "Los Angeles Kings",
  MIN: "Minnesota Wild",
  MTL: "Montréal Canadiens",
  NJD: "New Jersey Devils",
  NSH: "Nashville Predators",
  NYI: "New York Islanders",
  NYR: "New York Rangers",
  OTT: "Ottawa Senators",
  PHI: "Philadelphia Flyers",
  PIT: "Pittsburgh Penguins",
  SEA: "Seattle Kraken",
  SJS: "San Jose Sharks",
  STL: "St. Louis Blues",
  TBL: "Tampa Bay Lightning",
  TOR: "Toronto Maple Leafs",
  UTA: "Utah Mammoth",
  VAN: "Vancouver Canucks",
  VGK: "Vegas Golden Knights",
  WPG: "Winnipeg Jets",
  WSH: "Washington Capitals",
  // Historical franchises
  HFD: "Hartford Whalers",
  MNS: "Minnesota North Stars",
  PHX: "Phoenix Coyotes",
  QUE: "Quebec Nordiques",
  WIN: "Winnipeg Jets (1979)",
};

const ALIASES: Record<string, string> = {
  "L.A": "LAK",
  "N.J": "NJD",
  "S.J": "SJS",
  "T.B": "TBL",
};

/** Full name for an abbreviation, falling back to the abbreviation itself. */
export function getTeamName(abbrev: string): string {
  return TEAM_NAMES[ALIASES[abbrev] ?? abbrev] ?? abbrev;
}
