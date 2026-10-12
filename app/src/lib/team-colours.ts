/**
 * Team colours for player and team page headers.
 *
 * `primary` is the header background, so it must be dark enough for white
 * text (all values clear 4.5:1). `accent` is the stripe under the header and
 * the highlight colour for small text on it. Teams whose brand colour is too
 * light for a background (e.g. Flyers orange) use their dark colour as the
 * primary and the brand colour as the accent.
 */

export interface TeamColours {
  primary: string;
  accent: string;
}

const TEAM_COLOURS: Record<string, TeamColours> = {
  ANA: { primary: "#1b1b1b", accent: "#f47a38" },
  ARI: { primary: "#8c2633", accent: "#e2d6b5" },
  ATL: { primary: "#041e42", accent: "#5c88da" },
  BOS: { primary: "#1b1b1b", accent: "#ffb81c" },
  BUF: { primary: "#003087", accent: "#ffb81c" },
  CAR: { primary: "#c8102e", accent: "#1b1b1b" },
  CBJ: { primary: "#002654", accent: "#ce1126" },
  CGY: { primary: "#c8102e", accent: "#f1be48" },
  CHI: { primary: "#b40a26", accent: "#1b1b1b" },
  COL: { primary: "#6f263d", accent: "#6cace4" },
  DAL: { primary: "#006847", accent: "#a2aaad" },
  DET: { primary: "#c8102e", accent: "#ffffff" },
  EDM: { primary: "#041e42", accent: "#ff4c00" },
  FLA: { primary: "#041e42", accent: "#c8102e" },
  LAK: { primary: "#1b1b1b", accent: "#a2aaad" },
  MIN: { primary: "#154734", accent: "#a6192e" },
  MTL: { primary: "#af1e2d", accent: "#192168" },
  NJD: { primary: "#c8102e", accent: "#1b1b1b" },
  NSH: { primary: "#041e42", accent: "#ffb81c" },
  NYI: { primary: "#00539b", accent: "#f47d30" },
  NYR: { primary: "#0038a8", accent: "#ce1126" },
  OTT: { primary: "#b31d2c", accent: "#c2912c" },
  PHI: { primary: "#1b1b1b", accent: "#f74902" },
  PIT: { primary: "#1b1b1b", accent: "#fcb514" },
  SEA: { primary: "#001628", accent: "#99d9d9" },
  SJS: { primary: "#006d75", accent: "#ea7200" },
  STL: { primary: "#002f87", accent: "#fcb514" },
  TBL: { primary: "#002868", accent: "#ffffff" },
  TOR: { primary: "#00205b", accent: "#ffffff" },
  UTA: { primary: "#0b1a2a", accent: "#6cace4" },
  VAN: { primary: "#00205b", accent: "#00843d" },
  VGK: { primary: "#333f42", accent: "#b4975a" },
  WPG: { primary: "#041e42", accent: "#ac162c" },
  WSH: { primary: "#041e42", accent: "#c8102e" },
};

// MoneyPuck spells a few abbreviations with periods.
const ALIASES: Record<string, string> = {
  "L.A": "LAK",
  "N.J": "NJD",
  "S.J": "SJS",
  "T.B": "TBL",
};

/** Benchwarmer ink and blue, for players without a team or unknown abbreviations. */
export const DEFAULT_TEAM_COLOURS: TeamColours = {
  primary: "#111111",
  accent: "#2563eb",
};

export function getTeamColours(abbrev: string | null | undefined): TeamColours {
  if (!abbrev) return DEFAULT_TEAM_COLOURS;
  return TEAM_COLOURS[ALIASES[abbrev] ?? abbrev] ?? DEFAULT_TEAM_COLOURS;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Whether two colours are close enough that they blur together side by side
 * (e.g. OTT and NJD reds, or two navies). Uses the "redmean" weighted RGB
 * distance, a cheap approximation of perceived difference.
 */
export function coloursAreSimilar(a: string, b: string, threshold = 100): boolean {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const rMean = (r1 + r2) / 2;
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  const distance = Math.sqrt(
    (2 + rMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rMean) / 256) * db * db,
  );
  return distance < threshold;
}
