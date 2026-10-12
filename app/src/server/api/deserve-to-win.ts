// Who "deserved" to win from shot quality.
// Poisson: goals per team ~ Poisson(cumulative xG), OT a coin flip.
// Monte Carlo: each shot is a goal with probability xG; after a simulated
// goal on a shot that generated a rebound, the following rebound shots are
// skipped (one flurry can't produce several goals). Ties split 50/50.

export interface DeserveToWinShot {
  gameTimeSeconds: number;
  eventId: number;
  period: number;
  isHomeTeam: boolean;
  xGoal: number | null;
  isGoal: boolean;
  shotOnEmptyNet: boolean;
  shotRebound: boolean;
  shotGeneratedRebound: boolean;
}

export const MONTE_CARLO_SIMULATIONS = 10_000;
const MAX_GOALS = 15;

function logFactorial(n: number): number {
  let result = 0;
  for (let i = 2; i <= n; i++) result += Math.log(i);
  return result;
}

function poissonPmf(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return Math.exp(k * Math.log(lambda) - lambda - logFactorial(k));
}

export function poissonWinProbability(homeXg: number, awayXg: number): number {
  if (homeXg === 0 && awayXg === 0) return 0.5;
  let homeWin = 0;
  let tie = 0;
  for (let h = 0; h <= MAX_GOALS; h++) {
    const ph = poissonPmf(h, homeXg);
    for (let a = 0; a <= MAX_GOALS; a++) {
      const joint = ph * poissonPmf(a, awayXg);
      if (h > a) homeWin += joint;
      else if (h === a) tie += joint;
    }
  }
  return Math.min(1, Math.max(0, homeWin + tie * 0.5));
}

// Small seeded PRNG (mulberry32) so a game's result is reproducible across
// requests.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

export interface MonteCarloPrefix {
  homeWinPct: number;
  homeOtWinPct: number;
  awayOtWinPct: number;
}

// Monte Carlo results for every prefix of the shot list (index k = first
// k+1 shots). Each simulation is causal, so one pass yields the outcome after
// every shot; per-prefix results have the same distribution as a separate
// simulation per prefix, in O(sims x shots) instead of O(sims x shots²).
export function monteCarloByPrefix(
  shots: readonly Pick<DeserveToWinShot, "xGoal" | "isHomeTeam" | "shotRebound" | "shotGeneratedRebound">[],
  random: () => number,
  simulations = MONTE_CARLO_SIMULATIONS,
): MonteCarloPrefix[] {
  const n = shots.length;
  const homeWins = new Int32Array(n);
  const ties = new Int32Array(n);
  const xg = shots.map((s) => s.xGoal ?? 0);

  for (let sim = 0; sim < simulations; sim++) {
    let home = 0;
    let away = 0;
    let skipRebounds = false;
    for (let i = 0; i < n; i++) {
      const shot = shots[i];
      // A skipped rebound leaves the score after this prefix unchanged.
      if (!(skipRebounds && shot.shotRebound)) {
        skipRebounds = false;
        if (random() < xg[i]) {
          if (shot.isHomeTeam) home++;
          else away++;
          if (shot.shotGeneratedRebound) skipRebounds = true;
        }
      }
      if (home > away) homeWins[i]++;
      else if (home === away) ties[i]++;
    }
  }

  const result: MonteCarloPrefix[] = [];
  for (let i = 0; i < n; i++) {
    const homeOt = Math.trunc(ties[i] / 2);
    const awayOt = ties[i] - homeOt;
    result.push({
      homeWinPct: (homeWins[i] + homeOt) / simulations,
      homeOtWinPct: homeOt / simulations,
      awayOtWinPct: awayOt / simulations,
    });
  }
  return result;
}

export function calculateDeserveToWin(
  gameId: string,
  homeTeamCode: string,
  awayTeamCode: string,
  shots: readonly DeserveToWinShot[],
  homeGoals: number,
  awayGoals: number,
  random: () => number = mulberry32(hashSeed(gameId)),
) {
  const valid = shots
    .filter((s) => !s.shotOnEmptyNet)
    .sort((a, b) => a.gameTimeSeconds - b.gameTimeSeconds || a.eventId - b.eventId);
  const monteCarlo = monteCarloByPrefix(valid, random);
  const empty: MonteCarloPrefix = { homeWinPct: 0.5, homeOtWinPct: 0.25, awayOtWinPct: 0.25 };

  let homeXg = 0;
  let awayXg = 0;
  const progression = valid.map((shot, i) => {
    const shotXg = shot.xGoal ?? 0;
    if (shot.isHomeTeam) homeXg += shotXg;
    else awayXg += shotXg;
    return {
      shotNumber: i + 1,
      gameTimeSeconds: shot.gameTimeSeconds,
      period: shot.period,
      isHomeShot: shot.isHomeTeam,
      shotXG: shotXg,
      homeXGCumulative: homeXg,
      awayXGCumulative: awayXg,
      homePoissonWinPct: poissonWinProbability(homeXg, awayXg),
      homeMonteCarloWinPct: monteCarlo[i].homeWinPct,
      wasGoal: shot.isGoal ? true : null,
      isRebound: shot.shotRebound,
    };
  });

  const poisson = poissonWinProbability(homeXg, awayXg);
  const final = monteCarlo[monteCarlo.length - 1] ?? empty;
  return {
    gameId,
    homeTeamCode,
    awayTeamCode,
    homeGoals,
    awayGoals,
    homeSummary: {
      totalXG: homeXg,
      poissonWinPct: poisson,
      monteCarloWinPct: final.homeWinPct,
      monteCarloOTWinPct: final.homeOtWinPct,
      shotsExcludingEmptyNet: valid.filter((s) => s.isHomeTeam).length,
    },
    awaySummary: {
      totalXG: awayXg,
      poissonWinPct: 1 - poisson,
      monteCarloWinPct: 1 - final.homeWinPct,
      monteCarloOTWinPct: final.awayOtWinPct,
      shotsExcludingEmptyNet: valid.filter((s) => !s.isHomeTeam).length,
    },
    progression,
  };
}
