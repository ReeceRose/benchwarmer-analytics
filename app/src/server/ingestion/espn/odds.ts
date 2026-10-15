// Sportsbook moneylines from ESPN → game_odds, for benchmarking our pregame
// model. Never served by the API. ESPN keeps each line's open and close after
// the game, so a run the next morning gets the true closing line.
//
// Older games list up to a dozen books and some are junk: several report
// puck-line prices as moneylines (both sides plus money), and "Live Odds"
// entries are in-game prices. Only a few books are kept, and each pair of
// prices has to look like a real moneyline (see `moneylinePair`).

import { gameOdds } from "@/server/db/schema";
import { upsert, type Queryable } from "@/server/ingestion/db";
import { fetchOdds, fetchScoreboard, type EspnEvent, type EspnOddsItem } from "@/server/ingestion/espn/client";
import { sleep } from "@/server/ingestion/http";
import { roundHalfEven } from "@/server/ingestion/normalize";
import type { Logger } from "@/server/ingestion/sync-runs";

// ESPN provider IDs we trust, best first. DraftKings' old ID (40) often
// carried puck-line prices, so only its current one (100) is used.
export const PROVIDERS: Record<string, string> = {
  "58": "ESPN BET",
  "100": "DraftKings",
  "45": "Caesars",
  "47": "MGM",
};

/** "+120" → 120, "-110" → -110, "EVEN" → 100; null when missing or unreadable. */
export function americanOdds(value: string | null | undefined): number | null {
  if (!value) return null;
  const v = value.trim().toUpperCase();
  if (v === "EVEN" || v === "EV" || v === "PK") return 100;
  if (!/^[+-]?\d+$/.test(v)) return null;
  const n = Number(v);
  return Math.abs(n) >= 100 ? n : null;
}

/** Implied probability of American odds, margin included. */
export const impliedProbability = (american: number) => (american < 0 ? -american / (-american + 100) : 100 / (american + 100));

/**
 * Home and away moneylines and the home win probability with the margin
 * removed, or null when the pair doesn't look like a real moneyline:
 * prices beyond ±2000 (no NHL game is that lopsided), or implied
 * probabilities summing outside 1.00–1.10 (a puck line, or a stale side).
 */
export function moneylinePair(home: number | null, away: number | null): { home: number; away: number; homeProbability: number } | null {
  if (home === null || away === null) return null;
  if (Math.abs(home) > 2000 || Math.abs(away) > 2000) return null;
  const h = impliedProbability(home);
  const a = impliedProbability(away);
  const overround = h + a;
  if (overround < 1 || overround > 1.1) return null;
  return { home, away, homeProbability: h / overround };
}

export interface OddsRow {
  gameId: string;
  espnEventId: string;
  providerId: string;
  provider: string;
  homeMoneylineOpen: number | null;
  awayMoneylineOpen: number | null;
  homeMoneylineClose: number | null;
  awayMoneylineClose: number | null;
  homeProbabilityOpen: string | null;
  homeProbabilityClose: string | null;
  totalClose: string | null;
}

const probability = (p: number | undefined) => (p === undefined ? null : roundHalfEven(p, 4));

/** Rows for the trusted books with at least one usable line; null fields where a line failed its checks. */
export function toOddsRows(gameId: string, eventId: string, items: readonly EspnOddsItem[]): OddsRow[] {
  const rows: OddsRow[] = [];
  for (const item of items) {
    const provider = PROVIDERS[item.provider.id];
    if (!provider) continue;
    const price = (side: "homeTeamOdds" | "awayTeamOdds", when: "open" | "close") =>
      americanOdds(item[side]?.[when]?.moneyLine?.american);
    const open = moneylinePair(price("homeTeamOdds", "open"), price("awayTeamOdds", "open"));
    const close = moneylinePair(price("homeTeamOdds", "close"), price("awayTeamOdds", "close"));
    if (!open && !close) continue;
    const total = Number(item.close?.total?.american);
    rows.push({
      gameId,
      espnEventId: eventId,
      providerId: item.provider.id,
      provider,
      homeMoneylineOpen: open?.home ?? null,
      awayMoneylineOpen: open?.away ?? null,
      homeMoneylineClose: close?.home ?? null,
      awayMoneylineClose: close?.away ?? null,
      homeProbabilityOpen: probability(open?.homeProbability),
      homeProbabilityClose: probability(close?.homeProbability),
      totalClose: Number.isFinite(total) && total > 0 && total < 15 ? String(total) : null,
    });
  }
  return rows;
}

interface StoredGame {
  gameId: string;
  home: string;
  away: string;
}

/** ESPN events matched to our games by home and away team (one date's games). */
export function matchEvents(events: readonly EspnEvent[], games: readonly StoredGame[]) {
  const byTeams = new Map(games.map((g) => [`${g.away}@${g.home}`, g.gameId]));
  const matched: { eventId: string; gameId: string }[] = [];
  let unmatched = 0;
  for (const e of events) {
    const gameId = e.home && e.away ? byTeams.get(`${e.away}@${e.home}`) : undefined;
    if (gameId) matched.push({ eventId: e.eventId, gameId });
    else unmatched++;
  }
  return { matched, unmatched };
}

export interface OddsResult {
  games: number;
  written: number;
  unmatchedEvents: number;
  failedGames: number;
  noLines: number;
}

/**
 * Lines for every regular-season and playoff game on the given dates (ET).
 * Each game is fetched on its own: a failure is logged and counted, and the
 * step only fails when more than half the games did (ESPN is down or has
 * changed). `delayMs` spaces requests out for backfills.
 */
export async function importOdds(db: Queryable, dates: readonly string[], logger: Logger, delayMs = 0): Promise<OddsResult> {
  const result: OddsResult = { games: 0, written: 0, unmatchedEvents: 0, failedGames: 0, noLines: 0 };
  for (const date of dates) {
    const { rows: games } = await db.query<StoredGame>(
      `SELECT game_id AS "gameId", home_team_code AS home, away_team_code AS away
       FROM games WHERE game_date = $1 AND game_type IN (2, 3)`,
      [date],
    );
    if (games.length === 0) continue;
    const events = await fetchScoreboard(date);
    const { matched, unmatched } = matchEvents(events.entries, games);
    result.unmatchedEvents += unmatched + events.skipped;
    for (const { eventId, gameId } of matched) {
      result.games++;
      try {
        const odds = await fetchOdds(eventId);
        const rows = toOddsRows(gameId, eventId, odds.entries);
        if (rows.length === 0) result.noLines++;
        result.written += await upsert(db, gameOdds, rows, { conflict: ["gameId", "providerId"] });
      } catch (error) {
        result.failedGames++;
        logger.warn(`espn_odds ${gameId}: ${error instanceof Error ? error.message : String(error)}`);
      }
      if (delayMs > 0) await sleep(delayMs);
    }
  }
  logger.info(`espn_odds ${dates[0] ?? ""}..${dates.at(-1) ?? ""}: ${JSON.stringify(result)}`);
  if (result.games > 0 && result.failedGames > result.games / 2) {
    throw new Error(`ESPN odds failed for ${result.failedGames} of ${result.games} games`);
  }
  return result;
}
