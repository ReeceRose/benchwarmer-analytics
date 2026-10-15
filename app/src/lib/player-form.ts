import type { GoalieGameLogEntry, SkaterGameLogEntry } from "@/types";

/** A per-game rate over a set of games; null when there's nothing to measure. */
export type GamesMetric<G> = (games: readonly G[]) => number | null;

export interface PlayerFormPoint<G> {
  gameNum: number;
  game: G;
  /** Games in the window (fewer than the window size early in the season) */
  windowGames: number;
  /** Null before the window has `minGames` games */
  value: number | null;
}

/** A metric over a trailing window of games, oldest first. */
export function rollingMetric<G>(
  games: readonly G[],
  metric: GamesMetric<G>,
  window: number,
  minGames: number,
): PlayerFormPoint<G>[] {
  return games.map((game, i) => {
    const recent = games.slice(Math.max(0, i - window + 1), i + 1);
    return {
      gameNum: i + 1,
      game,
      windowGames: recent.length,
      value: recent.length >= minGames ? metric(recent) : null,
    };
  });
}

const total = <G>(games: readonly G[], value: (g: G) => number) => games.reduce((n, g) => n + value(g), 0);
const perGame = <G>(value: (g: G) => number): GamesMetric<G> => (games) =>
  games.length > 0 ? total(games, value) / games.length : null;

export const SKATER_METRICS = {
  points: perGame<SkaterGameLogEntry>((g) => g.points),
  goals: perGame<SkaterGameLogEntry>((g) => g.goals),
  assists: perGame<SkaterGameLogEntry>((g) => g.assists),
  shots: perGame<SkaterGameLogEntry>((g) => g.shots),
  // Only games with shots stored count, so a missing day doesn't read as 0 xG.
  xGoals: ((games) => {
    const withXg = games.filter((g) => g.xGoals !== null);
    return withXg.length > 0 ? total(withXg, (g) => g.xGoals!) / withXg.length : null;
  }) as GamesMetric<SkaterGameLogEntry>,
  toiMinutes: perGame<SkaterGameLogEntry>((g) => g.toiSeconds / 60),
};

export const GOALIE_METRICS = {
  // Pooled over the window (saves / shots), not an average of per-game values.
  savePct: ((games) => {
    const shots = total(games, (g) => g.shotsAgainst);
    return shots > 0 ? 1 - total(games, (g) => g.goalsAgainst) / shots : null;
  }) as GamesMetric<GoalieGameLogEntry>,
  gsaxPerGame: ((games) => {
    const withXg = games.filter((g) => g.goalsSavedAboveExpected !== null);
    return withXg.length > 0 ? total(withXg, (g) => g.goalsSavedAboveExpected!) / withXg.length : null;
  }) as GamesMetric<GoalieGameLogEntry>,
  goalsAgainstAverage: ((games) => {
    const seconds = total(games, (g) => g.toiSeconds);
    return seconds > 0 ? (total(games, (g) => g.goalsAgainst) * 3600) / seconds : null;
  }) as GamesMetric<GoalieGameLogEntry>,
};

/** The most recent `n` games for each n that's smaller than the season, then the season. */
export function stretches<G>(games: readonly G[], sizes: readonly number[]): { label: string; games: readonly G[]; isSeason: boolean }[] {
  const rows = sizes
    .filter((n) => n < games.length)
    .map((n) => ({ label: `Last ${n}`, games: games.slice(-n), isSeason: false }));
  return [...rows, { label: "Season", games, isSeason: true }];
}

/** Home and away games. */
export function venueSplits<G extends { isHome: boolean }>(games: readonly G[]) {
  return [
    { label: "Home", games: games.filter((g) => g.isHome) },
    { label: "Away", games: games.filter((g) => !g.isHome) },
  ];
}

export interface ScoringBreakdown {
  points: number;
  powerPlayPoints: number;
  otherPoints: number;
  multiPointGames: number;
  pointlessGames: number;
  games: number;
}

/** Where a skater's points came from, and how often they score. */
export function scoringBreakdown(games: readonly SkaterGameLogEntry[]): ScoringBreakdown {
  const points = total(games, (g) => g.points);
  const powerPlayPoints = total(games, (g) => g.powerPlayPoints);
  return {
    points,
    powerPlayPoints,
    otherPoints: points - powerPlayPoints,
    multiPointGames: games.filter((g) => g.points >= 2).length,
    pointlessGames: games.filter((g) => g.points === 0).length,
    games: games.length,
  };
}
