import type { TeamGameLogEntry, TeamGameSplit } from "@/types";

export type FormSituation = "fiveOnFive" | "all";

export interface FormPoint {
  gameNum: number;
  game: TeamGameLogEntry;
  /** Games in the window (fewer than the window size early in the season) */
  windowGames: number;
  /** Share of expected goals over the window, 0-100; null when there were none */
  xgShare: number | null;
  /** Share of goals over the window, 0-100; null when there were none */
  goalShare: number | null;
}

function share(forValue: number, againstValue: number): number | null {
  const total = forValue + againstValue;
  return total > 0 ? (forValue / total) * 100 : null;
}

export function splitFor(game: TeamGameLogEntry, situation: FormSituation): TeamGameSplit | null {
  return situation === "all" ? game.all : game.fiveOnFive;
}

/** xG and goal shares over a rolling window of games, oldest first. */
export function rollingForm(games: readonly TeamGameLogEntry[], situation: FormSituation, window: number): FormPoint[] {
  return games.map((game, i) => {
    const recent = games.slice(Math.max(0, i - window + 1), i + 1);
    let xgf = 0;
    let xga = 0;
    let gf = 0;
    let ga = 0;
    for (const g of recent) {
      const split = splitFor(g, situation);
      if (!split) continue;
      xgf += split.xGoalsFor;
      xga += split.xGoalsAgainst;
      gf += split.goalsFor;
      ga += split.goalsAgainst;
    }
    return {
      gameNum: i + 1,
      game,
      windowGames: recent.length,
      xgShare: share(xgf, xga),
      goalShare: share(gf, ga),
    };
  });
}

/** Share of expected goals over all games, 0-100. */
export function seasonXgShare(games: readonly TeamGameLogEntry[], situation: FormSituation): number | null {
  let xgf = 0;
  let xga = 0;
  for (const g of games) {
    const split = splitFor(g, situation);
    if (!split) continue;
    xgf += split.xGoalsFor;
    xga += split.xGoalsAgainst;
  }
  return share(xgf, xga);
}

export interface SplitSummary {
  key: string;
  label: string;
  games: number;
  wins: number;
  losses: number;
  otLosses: number;
  /** Points earned over points available, 0-1; null with no finished games */
  pointsPct: number | null;
  goalsFor: number;
  goalsAgainst: number;
  /** Share of expected goals, 0-100 */
  xgShare: number | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days off before each game (0 = second night of a back-to-back); null for the first game. */
export function restDays(games: readonly TeamGameLogEntry[]): (number | null)[] {
  return games.map((game, i) => {
    if (i === 0) return null;
    const gap = (Date.parse(game.gameDate) - Date.parse(games[i - 1].gameDate)) / DAY_MS;
    return Math.round(gap) - 1;
  });
}

function summarise(key: string, label: string, games: readonly TeamGameLogEntry[], situation: FormSituation): SplitSummary {
  const finished = games.filter((g) => g.result !== null);
  const wins = finished.filter((g) => g.result === "W").length;
  const otLosses = finished.filter((g) => g.result === "OTL").length;
  let xgf = 0;
  let xga = 0;
  let gf = 0;
  let ga = 0;
  for (const g of games) {
    const split = splitFor(g, situation);
    if (!split) continue;
    xgf += split.xGoalsFor;
    xga += split.xGoalsAgainst;
    gf += split.goalsFor;
    ga += split.goalsAgainst;
  }
  return {
    key,
    label,
    games: games.length,
    wins,
    losses: finished.length - wins - otLosses,
    otLosses,
    pointsPct: finished.length > 0 ? (wins * 2 + otLosses) / (finished.length * 2) : null,
    goalsFor: gf,
    goalsAgainst: ga,
    xgShare: share(xgf, xga),
  };
}

/** Home/away and rest splits. Goals and xG follow the situation; records use final results. */
export function teamSplits(games: readonly TeamGameLogEntry[], situation: FormSituation): SplitSummary[] {
  const rest = restDays(games);
  const byRest = (match: (days: number) => boolean) => games.filter((_, i) => rest[i] !== null && match(rest[i]!));
  return [
    summarise("home", "Home", games.filter((g) => g.isHome), situation),
    summarise("away", "Away", games.filter((g) => !g.isHome), situation),
    summarise("b2b", "Back-to-back", byRest((d) => d === 0), situation),
    summarise("rest1", "One day off", byRest((d) => d === 1), situation),
    summarise("rest2", "Two or more days off", byRest((d) => d >= 2), situation),
  ];
}
