import { REST_FEATURE, teamStrength, type Rating } from "@/lib/projections/ratings";

// Monte Carlo of the rest of the regular season and the playoffs.

export interface SimTeam {
  abbrev: string;
  conference: string;
  division: string;
  points: number;
  gamesPlayed: number;
  /** Regulation wins, the first standings tiebreaker after points. */
  regulationWins: number;
  rating: Rating;
  /** Extra logit for this team in playoff games (the experimental injury model). */
  playoffAdjust?: number;
}

export interface SimGame {
  gameId: string;
  home: string;
  away: string;
  /** Rest gap (restGap in ratings.ts). */
  rest?: number;
  /** Extra logit for the home team (the experimental injury model). */
  adjust?: number;
}

export interface SimOptions {
  sims: number;
  seed: number;
  coefficients: readonly number[];
  overtimeRate: number;
  /**
   * Uncertainty in each team's true strength, on the logit scale, before any
   * games: each simulated season draws every team an offset with this SD,
   * shrunk by games played like the rating. Without it, a rating seven games
   * into a season is treated as exact and favourites' odds compound.
   */
  strengthSd?: number;
  /** The rating's prior weight in games (RATING_PARAMS.priorGames). */
  priorGames?: number;
  /** Games whose result to condition on (tonight's), for "if they win / lose". */
  watch?: readonly string[];
}

export interface TeamOdds {
  abbrev: string;
  pointsAvg: number;
  pointsP10: number;
  pointsP90: number;
  makePlayoffs: number;
  winRound1: number;
  winRound2: number;
  winConference: number;
  winCup: number;
}

export interface WatchedGameOdds {
  gameId: string;
  homeWinProbability: number;
  /** Each team's playoff odds if it wins or loses this game. */
  homeIfWin: number;
  homeIfLoss: number;
  awayIfWin: number;
  awayIfLoss: number;
}

/** Small fast seeded PRNG (mulberry32), so a run is reproducible. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Chance the team with home ice wins a best-of-seven (2-2-1-1-1), given its
 * chance of winning at home and on the road.
 */
export function seriesWinProbability(pHome: number, pAway: number): number {
  const homeGames = [true, true, false, false, true, false, true];
  // memo[i][w] = P(win series | i games played, w of them won)
  const memo = new Map<string, number>();
  const go = (i: number, w: number): number => {
    const l = i - w;
    if (w === 4) return 1;
    if (l === 4) return 0;
    const key = `${i},${w}`;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    const p = homeGames[i] ? pHome : pAway;
    const v = p * go(i + 1, w + 1) + (1 - p) * go(i + 1, w);
    memo.set(key, v);
    return v;
  };
  return go(0, 0);
}

export function simulateSeason(teams: readonly SimTeam[], remaining: readonly SimGame[], options: SimOptions) {
  const n = teams.length;
  const index = new Map(teams.map((t, i) => [t.abbrev, i]));
  const random = rng(options.seed);
  const coef = options.coefficients;
  const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
  // Each team's strength on the logit scale (the model's rating terms), so a
  // game's logit is home ice + strength(home) - strength(away).
  const homeIce = coef[0];
  const restCoef = coef[REST_FEATURE] ?? 0;
  const strength = teams.map((t) => teamStrength(t.rating, coef));
  const playoffAdjust = teams.map((t) => t.playoffAdjust ?? 0);
  const priorGames = options.priorGames ?? 40;
  const sd = teams.map((t) => (options.strengthSd ?? 0) * Math.sqrt(priorGames / (t.gamesPlayed + priorGames)));
  const offset = new Float64Array(n);
  const normal = () => Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());

  const games = remaining.flatMap((g) => {
    const h = index.get(g.home);
    const a = index.get(g.away);
    if (h === undefined || a === undefined) return [];
    const base = homeIce + restCoef * (g.rest ?? 0) + (g.adjust ?? 0);
    return [{ id: g.gameId, h, a, base, p: sigmoid(base + strength[h] - strength[a]) }];
  });

  // Series odds for a pairing in this simulated season, the first team
  // holding home ice.
  const series = (hi: number, lo: number) => {
    const gap = strength[hi] + offset[hi] + playoffAdjust[hi] - strength[lo] - offset[lo] - playoffAdjust[lo];
    return seriesWinProbability(sigmoid(homeIce + gap), 1 - sigmoid(homeIce - gap));
  };

  const conferences = new Map<string, number[]>();
  const divisions = new Map<string, number[]>();
  teams.forEach((t, i) => {
    conferences.set(t.conference, [...(conferences.get(t.conference) ?? []), i]);
    divisions.set(t.division, [...(divisions.get(t.division) ?? []), i]);
  });

  const watchIndex = new Map((options.watch ?? []).map((id, k) => [id, k]));
  const watched = games.filter((g) => watchIndex.has(g.id));
  // Per watched game: [home wins, home playoffs | home win, away playoffs | home win,
  //                    home playoffs | away win, away playoffs | away win]
  const watchCounts = watched.map(() => [0, 0, 0, 0, 0]);
  const watchResult = new Array<boolean>(watched.length);

  const MAX_POINTS = 200;
  const histogram = teams.map(() => new Int32Array(MAX_POINTS + 1));
  const counts = teams.map(() => ({ playoffs: 0, r1: 0, r2: 0, conf: 0, cup: 0 }));
  const points = new Float64Array(n);
  const rw = new Float64Array(n);
  const tiebreak = new Float64Array(n);

  for (let sim = 0; sim < options.sims; sim++) {
    for (let i = 0; i < n; i++) {
      points[i] = teams[i].points;
      rw[i] = teams[i].regulationWins;
      tiebreak[i] = random();
      offset[i] = sd[i] > 0 ? sd[i] * normal() : 0;
    }
    let w = 0;
    for (const g of games) {
      const p = sd[g.h] > 0 || sd[g.a] > 0 ? sigmoid(g.base + strength[g.h] + offset[g.h] - strength[g.a] - offset[g.a]) : g.p;
      const homeWins = random() < p;
      const overtime = random() < options.overtimeRate;
      const [win, lose] = homeWins ? [g.h, g.a] : [g.a, g.h];
      points[win] += 2;
      if (overtime) points[lose] += 1;
      else rw[win] += 1;
      if (watchIndex.has(g.id)) watchResult[w++] = homeWins;
    }
    const rank = (a: number, b: number) => points[b] - points[a] || rw[b] - rw[a] || tiebreak[b] - tiebreak[a];

    const made = new Uint8Array(n);
    const champions: number[] = [];
    for (const members of conferences.values()) {
      const divs = [...divisions.values()].filter((d) => members.includes(d[0]));
      const tops = divs.map((d) => [...d].sort(rank).slice(0, 3));
      const inTops = new Set(tops.flat());
      const wildCards = members.filter((i) => !inTops.has(i)).sort(rank).slice(0, 2);
      for (const i of [...inTops, ...wildCards]) made[i] = 1;
      // The better division winner plays the second wild card.
      const [first, second] = tops.sort((a, b) => rank(a[0], b[0]));
      const play = (x: number, y: number) => {
        const [hi, lo] = rank(x, y) <= 0 ? [x, y] : [y, x];
        return random() < series(hi, lo) ? hi : lo;
      };
      const bracket = [
        [play(first[0], wildCards[1]), play(first[1], first[2])],
        [play(second[0], wildCards[0]), play(second[1], second[2])],
      ];
      for (const pair of bracket) for (const t of pair) counts[t].r1++;
      const finalists = bracket.map(([x, y]) => play(x, y));
      for (const t of finalists) counts[t].r2++;
      const champ = play(finalists[0], finalists[1]);
      counts[champ].conf++;
      champions.push(champ);
    }
    if (champions.length === 2) counts[(() => {
      const [x, y] = champions;
      const [hi, lo] = rank(x, y) <= 0 ? [x, y] : [y, x];
      return random() < series(hi, lo) ? hi : lo;
    })()].cup++;

    for (let i = 0; i < n; i++) {
      counts[i].playoffs += made[i];
      histogram[i][Math.min(MAX_POINTS, Math.round(points[i]))]++;
    }
    watched.forEach((g, k) => {
      const c = watchCounts[k];
      if (watchResult[k]) {
        c[0]++;
        c[1] += made[g.h];
        c[2] += made[g.a];
      } else {
        c[3] += made[g.h];
        c[4] += made[g.a];
      }
    });
  }

  const sims = options.sims;
  const percentile = (h: Int32Array, q: number) => {
    let acc = 0;
    for (let p = 0; p <= MAX_POINTS; p++) {
      acc += h[p];
      if (acc >= q * sims) return p;
    }
    return MAX_POINTS;
  };
  const odds: TeamOdds[] = teams.map((t, i) => {
    let total = 0;
    histogram[i].forEach((c, p) => (total += c * p));
    return {
      abbrev: t.abbrev,
      pointsAvg: total / sims,
      pointsP10: percentile(histogram[i], 0.1),
      pointsP90: percentile(histogram[i], 0.9),
      makePlayoffs: counts[i].playoffs / sims,
      winRound1: counts[i].r1 / sims,
      winRound2: counts[i].r2 / sims,
      winConference: counts[i].conf / sims,
      winCup: counts[i].cup / sims,
    };
  });
  const watchedOdds: WatchedGameOdds[] = watched.map((g, k) => {
    const [homeWins, hIfW, aIfL, hIfL, aIfW] = watchCounts[k];
    const awayWins = sims - homeWins;
    return {
      gameId: g.id,
      homeWinProbability: g.p,
      homeIfWin: homeWins ? hIfW / homeWins : 0,
      homeIfLoss: awayWins ? hIfL / awayWins : 0,
      awayIfWin: awayWins ? aIfW / awayWins : 0,
      awayIfLoss: homeWins ? aIfL / homeWins : 0,
    };
  });
  return { odds, watched: watchedOdds };
}
