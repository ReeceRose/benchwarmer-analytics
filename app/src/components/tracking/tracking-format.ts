import { formatOrdinal } from "@/lib/formatters";
import { formatGameDate } from "@/lib/game-formatters";
import type { TrackingMetric, TrackingMoment } from "@/types";

const TEAMS = 32;

/**
 * Where a metric sits in the league, 0-100 (higher is better): the player's
 * percentile, or a team's rank turned into the same scale.
 */
export function standing(m: Pick<TrackingMetric, "percentile" | "rank">): number | null {
  // 1st to 99th: a 100th percentile isn't a thing.
  if (m.percentile != null) return Math.min(99, Math.max(1, Math.round(m.percentile * 100)));
  if (m.rank != null) return Math.round((100 * (TEAMS - m.rank)) / (TEAMS - 1));
  return null;
}

/** "Oct 3, SEA @ EDM, 1st 4:16" (and who, for team peaks). */
export function formatMoment(m: TrackingMoment | null): string | null {
  if (!m) return null;
  const parts = [formatGameDate(m.gameDate)];
  if (m.away && m.home) parts.push(`${m.away} @ ${m.home}`);
  if (m.period) parts.push(`${m.period > 3 ? "OT" : formatOrdinal(m.period)}${m.timeInPeriod ? ` ${m.timeInPeriod}` : ""}`);
  return `${m.playerName ? `${m.playerName}, ` : ""}${parts.join(", ")}`;
}
