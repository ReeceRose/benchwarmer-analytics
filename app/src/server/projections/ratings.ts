// Team strength for pregame win probability and season simulation.
//
// A rating is two per-game differentials: 5v5 expected goals (score and
// venue adjusted, so it measures play rather than results) and all-situations
// goals (which carries goaltending, special teams and finishing). Early in a
// season both lean on last season's numbers, shrunk toward average.

export interface TeamGameStats {
  team: string;
  /** 5v5 score- and venue-adjusted xG for and against. */
  xgf: number;
  xga: number;
  /** All-situations goals for and against. */
  gf: number;
  ga: number;
}

export interface Rating {
  /** 5v5 xG differential per game. */
  xgd: number;
  /** Goal differential per game. */
  gd: number;
  gamesPlayed: number;
}

export interface RatingParams {
  /** Games of this season it takes to count as much as the prior. */
  priorGames: number;
  /** How much of last season's rating carries over (0 = start at average). */
  carryOver: number;
}

/** Season-to-date totals for one team. */
export interface RatingSums {
  xgd: number;
  gd: number;
  n: number;
}

/** This season's totals blended with last season's per-game rating. */
export function blendRating(s: RatingSums, prior: Rating | undefined, params: RatingParams): Rating {
  const priorXgd = (prior?.xgd ?? 0) * params.carryOver;
  const priorGd = (prior?.gd ?? 0) * params.carryOver;
  // Shrinkage: the prior counts as `priorGames` games of evidence.
  const w = params.priorGames;
  return { xgd: (s.xgd + priorXgd * w) / (s.n + w), gd: (s.gd + priorGd * w) / (s.n + w), gamesPlayed: s.n };
}

/** Accumulates per-game sums for each team. */
export class RatingTable {
  private sums = new Map<string, RatingSums>();

  add(g: TeamGameStats) {
    const s = this.sums.get(g.team) ?? { xgd: 0, gd: 0, n: 0 };
    s.xgd += g.xgf - g.xga;
    s.gd += g.gf - g.ga;
    s.n += 1;
    this.sums.set(g.team, s);
  }

  /** Full-table per-game averages (last season's priors). */
  averages(): Map<string, Rating> {
    return new Map([...this.sums].map(([team, s]) => [team, { xgd: s.xgd / s.n, gd: s.gd / s.n, gamesPlayed: s.n }]));
  }

  /** This season so far, blended with the carried-over prior. */
  rating(team: string, prior: Rating | undefined, params: RatingParams): Rating {
    return blendRating(this.sums.get(team) ?? { xgd: 0, gd: 0, n: 0 }, prior, params);
  }
}

/** Model features for a game: [1 (home ice), xG gap, goal gap]. */
export function pregameFeatures(home: Rating, away: Rating): number[] {
  return [1, home.xgd - away.xgd, home.gd - away.gd];
}

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

/** The home team's chance of winning (including overtime and shootouts). */
export function pregameHomeWinProbability(home: Rating, away: Rating, coefficients: readonly number[]): number {
  return sigmoid(pregameFeatures(home, away).reduce((s, v, i) => s + v * coefficients[i], 0));
}

/** Logit of a probability, for handing the pregame number to the in-game model. */
export function logit(p: number): number {
  const q = Math.min(Math.max(p, 1e-6), 1 - 1e-6);
  return Math.log(q / (1 - q));
}
