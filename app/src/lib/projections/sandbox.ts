import { outlookGap } from "@/lib/projections/goalie-outlook";
import { blendRating, logit } from "@/lib/projections/ratings";
import { simulateSeason, type SimGame, type SimTeam, type TeamOdds } from "@/lib/projections/simulate";
import type { SandboxInputs } from "@/types";

// The playoff odds sandbox: the main model's simulation with the reader's
// settings, run in the browser (sandbox.worker.ts) from the latest run's
// inputs (GET /api/projections/sandbox).

/** Simulated seasons per sandbox run: about a second in the browser, ±1 point of noise on a 50% team. */
export const SANDBOX_SIMS = 5000;

export interface SandboxSettings {
  /** Multipliers on the main model's weights (1 = as fitted). */
  homeIce: number;
  xg: number;
  goals: number;
  roster: number;
  goalie: number;
  rest: number;
  /** How much of last season's per-game rating carries over (0-1). */
  carryOver: number;
  /** Games of this season it takes to count as much as last season. */
  priorGames: number;
  /** How far a team's true strength may differ from its rating (logit SD before any games). */
  uncertainty: number;
  /** Sit injured goalies until their earliest return. */
  injuries: boolean;
  /** The reader's take per team: points of win chance against an average team (-10 to 10). */
  nudges: Record<string, number>;
}

/** The main model's settings: the sandbox's starting point. */
export function modelSettings(inputs: SandboxInputs): SandboxSettings {
  return {
    homeIce: 1,
    xg: 1,
    goals: 1,
    roster: 1,
    goalie: 1,
    rest: 1,
    carryOver: inputs.model.carryOver,
    priorGames: inputs.model.priorGames,
    uncertainty: inputs.model.strengthSd,
    injuries: false,
    nudges: {},
  };
}

/** Plays out the rest of the season with the reader's settings. Same inputs and settings, same odds. */
export function runSandbox(inputs: SandboxInputs, s: SandboxSettings, sims = SANDBOX_SIMS): TeamOdds[] {
  const m = inputs.model;
  const multipliers = [s.homeIce, s.xg, s.goals, s.roster, s.goalie, s.rest];
  const coefficients = m.coefficients.map((c, i) => c * (multipliers[i] ?? 1));
  const params = { priorGames: s.priorGames, carryOver: s.carryOver, rosterGames: m.rosterGames };
  const byTeam = new Map(inputs.teams.map((t) => [t.team, t]));
  const nudge = (team: string) => {
    const n = s.nudges[team] ?? 0;
    return n ? logit(0.5 + n / 100) : 0;
  };
  const gap = (team: string, date: string) => {
    const outlook = byTeam.get(team)?.goalieOutlook;
    return s.injuries && outlook ? m.starterGapCoefficient * s.goalie * outlookGap(outlook, date) : 0;
  };
  const lastDate = inputs.games.at(-1)?.date ?? inputs.runDate;
  const teams: SimTeam[] = inputs.teams.map((t) => ({
    abbrev: t.team,
    conference: t.conference,
    division: t.division,
    points: t.points,
    gamesPlayed: t.gamesPlayed,
    regulationWins: t.regulationWins,
    rating: blendRating(t.season, t.prior ? { ...t.prior, gamesPlayed: 0 } : undefined, params, { roster: t.roster, goalie: t.goalie }),
    playoffAdjust: nudge(t.team) + gap(t.team, lastDate),
  }));
  const games: SimGame[] = inputs.games.map((g) => ({
    gameId: g.gameId,
    home: g.home,
    away: g.away,
    rest: g.rest,
    adjust: nudge(g.home) - nudge(g.away) + gap(g.home, g.date) - gap(g.away, g.date),
  }));
  return simulateSeason(teams, games, {
    sims,
    seed: Number(inputs.runDate.replaceAll("-", "")),
    coefficients,
    overtimeRate: m.overtimeRate,
    strengthSd: s.uncertainty,
    priorGames: s.priorGames,
  }).odds;
}
