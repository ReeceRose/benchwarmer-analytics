// Team strength for pregame win probability and season simulation.
//
// A rating is two per-game differentials: 5v5 expected goals (score and
// venue adjusted, so it measures play rather than results) and all-situations
// goals (which carries goaltending, special teams and finishing). Early in a
// season both lean on last season's numbers, shrunk toward average. Two more
// terms say who's playing now: roster talent (roster.ts), which fades as the
// season's own numbers build up, and goaltending (goalies.ts).

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
  /** Roster talent as 5v5 xG differential per game, already faded by games played. */
  roster?: number;
  /** Goaltending in goals saved above expected per game. */
  goalie?: number;
}

export interface RatingParams {
  /** Games of this season it takes to count as much as the prior. */
  priorGames: number;
  /** How much of last season's rating carries over (0 = start at average). */
  carryOver: number;
  /** Games of this season it takes to halve the roster term. */
  rosterGames: number;
}

/** Season-to-date totals for one team. */
export interface RatingSums {
  xgd: number;
  gd: number;
  n: number;
}

/** Who's playing now: raw roster talent (xG differential per game) and goaltending. */
export interface Personnel {
  roster: number;
  goalie: number;
}

/** This season's totals blended with last season's per-game rating, plus the personnel terms. */
export function blendRating(s: RatingSums, prior: Rating | undefined, params: RatingParams, personnel?: Personnel): Rating {
  const priorXgd = (prior?.xgd ?? 0) * params.carryOver;
  const priorGd = (prior?.gd ?? 0) * params.carryOver;
  // Shrinkage: the prior counts as `priorGames` games of evidence.
  const w = params.priorGames;
  return {
    xgd: (s.xgd + priorXgd * w) / (s.n + w),
    gd: (s.gd + priorGd * w) / (s.n + w),
    gamesPlayed: s.n,
    roster: ((personnel?.roster ?? 0) * params.rosterGames) / (s.n + params.rosterGames),
    goalie: personnel?.goalie ?? 0,
  };
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
  rating(team: string, prior: Rating | undefined, params: RatingParams, personnel?: Personnel): Rating {
    return blendRating(this.sums.get(team) ?? { xgd: 0, gd: 0, n: 0 }, prior, params, personnel);
  }
}

/**
 * Model features for a game: [1 (home ice), xG gap, goal gap, roster gap,
 * goaltending gap, rest gap]. `rest` is 1 when only the away team played the
 * day before, -1 when only the home team did, else 0.
 */
export function pregameFeatures(home: Rating, away: Rating, rest = 0): number[] {
  return [1, home.xgd - away.xgd, home.gd - away.gd, (home.roster ?? 0) - (away.roster ?? 0), (home.goalie ?? 0) - (away.goalie ?? 0), rest];
}

/** Index of the rest coefficient; the ones between home ice and it are team strength. */
export const REST_FEATURE = 5;

/** A team's strength on the logit scale: its rating terms against an average team. */
export function teamStrength(r: Rating, coefficients: readonly number[]): number {
  const f = pregameFeatures(r, { xgd: 0, gd: 0, gamesPlayed: 0 });
  let s = 0;
  for (let i = 1; i < REST_FEATURE; i++) s += f[i] * (coefficients[i] ?? 0);
  return s;
}

/** The calendar day before a YYYY-MM-DD date. */
export function dayBefore(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Rest gap for `pregameFeatures` from whether each team played the day before. */
export function restGap(homeBackToBack: boolean, awayBackToBack: boolean): number {
  return Number(awayBackToBack) - Number(homeBackToBack);
}

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

/** The home team's chance of winning (including overtime and shootouts). */
export function pregameHomeWinProbability(home: Rating, away: Rating, coefficients: readonly number[], rest = 0): number {
  return sigmoid(pregameFeatures(home, away, rest).reduce((s, v, i) => s + v * (coefficients[i] ?? 0), 0));
}

/** Logit of a probability, for handing the pregame number to the in-game model. */
export function logit(p: number): number {
  const q = Math.min(Math.max(p, 1e-6), 1 - 1e-6);
  return Math.log(q / (1 - q));
}
