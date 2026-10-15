import { formatSeason } from "@/lib/formatters";
import type { DraftPick } from "@/types";

/** "1,082 GP, 1,689 P" for skaters, "612 GP, 301 W" for goalies. */
export function careerLine(pick: DraftPick): string {
  const c = pick.career;
  if (!c) return "No NHL games";
  const games = `${c.gamesPlayed.toLocaleString()} GP`;
  if (c.wins != null) return `${games}, ${c.wins.toLocaleString()} W`;
  return `${games}, ${(c.points ?? 0).toLocaleString()} P`;
}

/** "2015–16 to now" or "2008–09 to 2019–20". */
export function careerSpan(pick: DraftPick): string | null {
  const c = pick.career;
  if (!c?.firstSeason) return null;
  if (c.active) return `${formatSeason(c.firstSeason)} to now`;
  return c.lastSeason && c.lastSeason !== c.firstSeason
    ? `${formatSeason(c.firstSeason)} to ${formatSeason(c.lastSeason)}`
    : formatSeason(c.firstSeason);
}
