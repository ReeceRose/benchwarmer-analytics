// ESPN's public (undocumented) NHL endpoints: injuries, transactions,
// scoreboard and sportsbook odds. Nothing here is an official API, so every
// response is checked with zod before it's used: a changed top-level shape
// fails the step, and individual entries that don't parse are skipped and
// counted (see `parseEntries`).

import { z } from "zod";
import { fetchJson } from "@/server/ingestion/http";

const SITE_API = "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl";
const CORE_API = "https://sports.core.api.espn.com/v2/sports/hockey/leagues/nhl";

// ESPN's requests are small; a slow one is a stuck one.
const TIMEOUT_MS = 20_000;

// ESPN team codes that differ from ours. Seasons before 2024 use ARI.
const TEAM_CODES: Record<string, string> = { NJ: "NJD", SJ: "SJS", TB: "TBL", LA: "LAK", UTAH: "UTA" };

// ESPN team IDs (stable for decades) → ESPN abbreviations. The injury list
// names teams only by ID and display name.
const ESPN_TEAM_IDS: Record<string, string> = {
  "1": "BOS", "2": "BUF", "3": "CGY", "4": "CHI", "5": "DET", "6": "EDM", "7": "CAR", "8": "LA", "9": "DAL",
  "10": "MTL", "11": "NJ", "12": "NYI", "13": "NYR", "14": "OTT", "15": "PHI", "16": "PIT", "17": "COL",
  "18": "SJ", "19": "STL", "20": "TB", "21": "TOR", "22": "VAN", "23": "WSH", "24": "ARI", "25": "ANA",
  "26": "FLA", "27": "NSH", "28": "WPG", "29": "CBJ", "30": "MIN", "37": "VGK", "124292": "SEA", "129764": "UTAH",
};

const OUR_TEAMS = new Set([
  "ANA", "ARI", "BOS", "BUF", "CAR", "CBJ", "CGY", "CHI", "COL", "DAL", "DET", "EDM", "FLA", "LAK", "MIN", "MTL",
  "NJD", "NSH", "NYI", "NYR", "OTT", "PHI", "PIT", "SEA", "SJS", "STL", "TBL", "TOR", "UTA", "VAN", "VGK", "WPG", "WSH",
]);

/** Our team code for an ESPN abbreviation, or null for one we don't know. */
export function teamCode(espnAbbreviation: string | null | undefined): string | null {
  if (!espnAbbreviation) return null;
  const code = TEAM_CODES[espnAbbreviation] ?? espnAbbreviation;
  return OUR_TEAMS.has(code) ? code : null;
}

/** The ESPN athlete ID in a player-card link (".../player/_/id/5080145"). */
export function athleteIdFromLinks(links: readonly { href: string }[] | undefined): string | null {
  for (const link of links ?? []) {
    const match = /\/id\/(\d+)/.exec(link.href);
    if (match) return match[1];
  }
  return null;
}

/** ESPN's "2026-10-14T13:14Z" (no seconds) as a Date; null when unparseable. */
export function espnDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value.replace(/T(\d\d:\d\d)Z$/, "T$1:00Z"));
  return Number.isNaN(date.getTime()) ? null : date;
}

export class EspnFormatError extends Error {}

export interface Parsed<T> {
  entries: T[];
  skipped: number;
}

// Entries that don't match the schema are skipped. More than 10% skipped (and
// more than two) means ESPN changed the format, so the whole step fails
// rather than writing a partial picture.
export function parseEntries<T>(what: string, raw: readonly unknown[], schema: z.ZodType<T>): Parsed<T> {
  const entries: T[] = [];
  let skipped = 0;
  for (const item of raw) {
    const result = schema.safeParse(item);
    if (result.success) entries.push(result.data);
    else skipped++;
  }
  if (skipped > 2 && skipped > raw.length * 0.1) {
    throw new EspnFormatError(`ESPN ${what}: ${skipped} of ${raw.length} entries didn't parse; the format may have changed`);
  }
  return { entries, skipped };
}

function parseTop<T>(what: string, body: unknown, schema: z.ZodType<T>): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new EspnFormatError(`ESPN ${what}: unexpected response (${result.error.issues[0]?.message ?? "invalid"})`);
  }
  return result.data;
}

async function getJson(what: string, url: string): Promise<unknown> {
  const body = await fetchJson(url, { timeoutMs: TIMEOUT_MS });
  if (body === null) throw new Error(`ESPN ${what}: not found (${url})`);
  return body;
}

// --- Injuries ---

const linkSchema = z.object({ href: z.string() });

export const injuryEntrySchema = z.object({
  status: z.string().min(1),
  date: z.string().nullish(),
  shortComment: z.string().nullish(),
  longComment: z.string().nullish(),
  type: z.object({ name: z.string().nullish() }).nullish(),
  details: z
    .object({
      type: z.string().nullish(),
      detail: z.string().nullish(),
      side: z.string().nullish(),
      returnDate: z.string().nullish(),
    })
    .nullish(),
  athlete: z.object({
    displayName: z.string().min(1),
    links: z.array(linkSchema).nullish(),
    position: z.object({ abbreviation: z.string().nullish() }).nullish(),
  }),
});

export type EspnInjury = z.infer<typeof injuryEntrySchema>;

const injuriesSchema = z.object({
  injuries: z.array(
    z.object({
      id: z.string(),
      displayName: z.string().nullish(),
      injuries: z.array(z.unknown()),
    }),
  ),
});

export interface EspnTeamInjuries {
  /** Our team code; null for a team ESPN lists that we don't know. */
  team: string | null;
  teamName: string;
  injuries: Parsed<EspnInjury>;
}

export function parseInjuries(body: unknown): EspnTeamInjuries[] {
  return parseTop("injuries", body, injuriesSchema).injuries.map((team) => ({
    team: teamCode(ESPN_TEAM_IDS[team.id]),
    teamName: team.displayName ?? team.id,
    injuries: parseEntries("injuries", team.injuries, injuryEntrySchema),
  }));
}

export async function fetchInjuries(): Promise<EspnTeamInjuries[]> {
  return parseInjuries(await getJson("injuries", `${SITE_API}/injuries`));
}

// --- Athletes ---

const athleteSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  dateOfBirth: z.string().nullish(),
  position: z.object({ abbreviation: z.string().nullish() }).nullish(),
});

export type EspnAthlete = z.infer<typeof athleteSchema>;

export function parseAthlete(body: unknown): EspnAthlete {
  return parseTop("athlete", body, athleteSchema);
}

/** One athlete's details (date of birth), or null when ESPN has no record. */
export async function fetchAthlete(espnId: string): Promise<EspnAthlete | null> {
  const body = await fetchJson(`${CORE_API}/athletes/${espnId}`, { timeoutMs: TIMEOUT_MS });
  return body === null ? null : parseAthlete(body);
}

// --- Transactions ---

export const transactionSchema = z.object({
  date: z.string(),
  description: z.string().min(1),
  team: z.object({ abbreviation: z.string() }),
});

export type EspnTransaction = z.infer<typeof transactionSchema>;

const transactionsSchema = z.object({
  pageCount: z.number().int(),
  transactions: z.array(z.unknown()),
});

export function parseTransactionsPage(body: unknown) {
  const page = parseTop("transactions", body, transactionsSchema);
  return { pageCount: page.pageCount, ...parseEntries("transactions", page.transactions, transactionSchema) };
}

const yyyymmdd = (date: string) => date.replaceAll("-", "");

/** Transactions dated [start, end] (YYYY-MM-DD), every page. */
export async function fetchTransactions(start: string, end: string): Promise<Parsed<EspnTransaction>> {
  const entries: EspnTransaction[] = [];
  let skipped = 0;
  for (let page = 1; ; page++) {
    const url = `${SITE_API}/transactions?dates=${yyyymmdd(start)}-${yyyymmdd(end)}&limit=500&page=${page}`;
    const parsed = parseTransactionsPage(await getJson("transactions", url));
    entries.push(...parsed.entries);
    skipped += parsed.skipped;
    if (page >= parsed.pageCount) break;
  }
  return { entries, skipped };
}

// --- Scoreboard (ESPN event IDs for a date's games) ---

export const eventSchema = z.object({
  id: z.string(),
  competitions: z
    .array(
      z.object({
        competitors: z.array(z.object({ homeAway: z.enum(["home", "away"]), team: z.object({ abbreviation: z.string() }) })),
      }),
    )
    .min(1),
});

export interface EspnEvent {
  eventId: string;
  home: string | null;
  away: string | null;
}

const scoreboardSchema = z.object({ events: z.array(z.unknown()) });

export function parseScoreboard(body: unknown): Parsed<EspnEvent> {
  const { entries, skipped } = parseEntries("scoreboard", parseTop("scoreboard", body, scoreboardSchema).events, eventSchema);
  return {
    skipped,
    entries: entries.map((e) => {
      const side = (s: "home" | "away") => teamCode(e.competitions[0].competitors.find((c) => c.homeAway === s)?.team.abbreviation);
      return { eventId: e.id, home: side("home"), away: side("away") };
    }),
  };
}

/** A date's games (YYYY-MM-DD, ESPN's US date). */
export async function fetchScoreboard(date: string): Promise<Parsed<EspnEvent>> {
  return parseScoreboard(await getJson("scoreboard", `${SITE_API}/scoreboard?dates=${yyyymmdd(date)}`));
}

// --- Odds ---

const priceSchema = z.object({ moneyLine: z.object({ american: z.string().nullish() }).nullish() }).nullish();

const sideOddsSchema = z
  .object({ open: priceSchema, close: priceSchema })
  .nullish();

export const oddsItemSchema = z.object({
  provider: z.object({ id: z.string(), name: z.string() }),
  homeTeamOdds: sideOddsSchema,
  awayTeamOdds: sideOddsSchema,
  close: z.object({ total: z.object({ american: z.string().nullish() }).nullish() }).nullish(),
});

export type EspnOddsItem = z.infer<typeof oddsItemSchema>;

const oddsSchema = z.object({ items: z.array(z.unknown()) });

export function parseOdds(body: unknown): Parsed<EspnOddsItem> {
  return parseEntries("odds", parseTop("odds", body, oddsSchema).items, oddsItemSchema);
}

/** Every sportsbook's lines for an event; empty when ESPN has none. */
export async function fetchOdds(eventId: string): Promise<Parsed<EspnOddsItem>> {
  const body = await fetchJson(`${CORE_API}/events/${eventId}/competitions/${eventId}/odds?limit=50`, { timeoutMs: TIMEOUT_MS });
  return body === null ? { entries: [], skipped: 0 } : parseOdds(body);
}
