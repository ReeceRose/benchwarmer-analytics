// Backtests the season simulation to choose STRENGTH_SD (projections/run.ts):
// replays 2013-2018 and 2021-2025 from ~8, ~20, ~41 and ~60 games played,
// with ratings as they stood then (projections/history.ts), and scores the
// odds against what happened (franchise_seasons: playoffs, each round, Cup),
// plus how often each team's 10th-90th percentile points range held its
// final points (target 80%). Also checks whether a rating's edge fades for
// games further out, and compares the previous model. Read-only.
//
//   npx tsx scripts/calibrate-season-sims.ts
import { config } from "dotenv";
import pg from "pg";
import { loadHistory, walk, type HistoryGame, type WalkParams } from "@/server/projections/history";
import { fit } from "@/server/projections/logistic-fit";
import { GOALIE_PARAMS, OVERTIME_RATE, PREGAME_COEFFICIENTS, RATING_PARAMS, ROSTER_PARAMS } from "@/server/projections/pregame-model";
import { teamStrength, type Rating } from "@/lib/projections/ratings";
import { STRENGTH_SD } from "@/server/projections/run";
import { simulateSeason, type SimGame, type SimTeam } from "@/lib/projections/simulate";

config({ path: [".env.local", "../.env.local"], quiet: true });

// 2019-20 (bubble) and 2020-21 (temporary divisions) had other formats.
const SEASONS = [2013, 2014, 2015, 2016, 2017, 2018, 2021, 2022, 2023, 2024, 2025];
const CUTS = [8, 20, 41, 60];
const SIMS = 2000;
const CONFERENCE: Record<string, string> = { Atlantic: "Eastern", Metropolitan: "Eastern", Central: "Western", Pacific: "Western" };

interface Model {
  label: string;
  walk: WalkParams;
  coefficients: readonly number[];
}

const CURRENT: Model = { label: "current model", walk: { rating: RATING_PARAMS, goalie: GOALIE_PARAMS, roster: ROSTER_PARAMS }, coefficients: PREGAME_COEFFICIENTS };
// Before roster, goaltending and rest (October 2026), for comparison.
const PREVIOUS: Model = {
  label: "previous model",
  walk: { rating: { priorGames: 40, carryOver: 0.5, rosterGames: 1 }, goalie: GOALIE_PARAMS, roster: ROSTER_PARAMS },
  coefficients: [0.179214, 0.628011, 0.519842, 0, 0, 0],
};

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const client = new pg.Client({ connectionString: url, options: "-c default_transaction_read_only=on" });
await client.connect();
const history = await loadHistory(client, 2008, SEASONS.at(-1)!);
const { rows: outcomes } = await client.query<{ season: number; team: string; division: string; made: boolean; round: number | null; cup: boolean }>(
  `select season, team_abbreviation as team, division_name as division, made_playoffs as made, playoff_round as round, won_cup as cup
   from franchise_seasons where season = any($1)`,
  [SEASONS],
);

const bySeason = new Map<number, HistoryGame[]>();
for (const g of history.games) bySeason.set(g.season, [...(bySeason.get(g.season) ?? []), g]);
const teamCount = (season: number) => new Set(bySeason.get(season)!.map((g) => g.home)).size;
const cutIndex = (season: number, cut: number) => Math.round((cut * teamCount(season)) / 2);

interface Case {
  season: number;
  cut: number;
  teams: SimTeam[];
  remaining: SimGame[];
  final: Map<string, { points: number; outcome: number[] }>;
  later: { z: number; rest: number; daysAhead: number; won: boolean }[];
}

function standings(list: HistoryGame[]) {
  const t = new Map<string, { points: number; rw: number; n: number }>();
  const get = (k: string) => t.get(k) ?? (t.set(k, { points: 0, rw: 0, n: 0 }), t.get(k)!);
  for (const g of list) {
    const [w, l] = g.home_won ? [get(g.home), get(g.away)] : [get(g.away), get(g.home)];
    w.points += 2;
    w.n++;
    l.n++;
    if (g.went_to_ot) l.points++;
    else w.rw++;
  }
  return t;
}

const days = (from: string, to: string) => (Date.parse(to) - Date.parse(from)) / 86_400_000;

/** Every (season, cut) replay for a model: ratings at the cut, the games after it, and what happened. */
async function buildCases(model: Model): Promise<Case[]> {
  const cutGame = new Map<string, { season: number; cut: number }>();
  for (const season of SEASONS) for (const cut of CUTS) cutGame.set(bySeason.get(season)![cutIndex(season, cut)].game_id, { season, cut });
  const snapshots = new Map<string, Map<string, Rating>>();
  const samples = await walk(history, model.walk, (g, rate) => {
    const c = cutGame.get(g.game_id);
    if (!c) return;
    const teams = new Set(bySeason.get(c.season)!.flatMap((x) => [x.home, x.away]));
    snapshots.set(`${c.season}:${c.cut}`, new Map([...teams].map((t) => [t, rate(t)])));
  });
  const rest = new Map(samples.map((s) => [s.game.game_id, model.coefficients[5] ? s.rest : 0]));

  const cases: Case[] = [];
  for (const season of SEASONS) {
    const games = bySeason.get(season)!;
    const seasonOutcomes = new Map(outcomes.filter((o) => o.season === season).map((o) => [o.team, o]));
    const finalTable = standings(games);
    const missing = [...finalTable.keys()].filter((t) => !seasonOutcomes.has(t));
    if (missing.length) throw new Error(`${season}: no franchise_seasons row for ${missing.join(", ")}`);
    for (const cut of CUTS) {
      const at = cutIndex(season, cut);
      const before = standings(games.slice(0, at));
      const after = games.slice(at);
      const ratings = snapshots.get(`${season}:${cut}`)!;
      const teams: SimTeam[] = [...finalTable.keys()].map((abbrev) => {
        const o = seasonOutcomes.get(abbrev)!;
        const s = before.get(abbrev) ?? { points: 0, rw: 0, n: 0 };
        return { abbrev, conference: CONFERENCE[o.division], division: o.division, points: s.points, gamesPlayed: s.n, regulationWins: s.rw, rating: ratings.get(abbrev)! };
      });
      const strength = new Map(teams.map((t) => [t.abbrev, teamStrength(t.rating, model.coefficients)]));
      cases.push({
        season,
        cut,
        teams,
        remaining: after.map((g) => ({ gameId: g.game_id, home: g.home, away: g.away, rest: rest.get(g.game_id) ?? 0 })),
        final: new Map(
          [...finalTable].map(([t, s]) => {
            const o = seasonOutcomes.get(t)!;
            const round = o.round ?? 0;
            return [t, { points: s.points, outcome: [Number(o.made), Number(round >= 2), Number(round >= 3), Number(round >= 4), Number(o.cup)] }];
          }),
        ),
        later: after.map((g) => ({
          z: strength.get(g.home)! - strength.get(g.away)!,
          rest: rest.get(g.game_id) ?? 0,
          daysAhead: days(after[0].game_date, g.game_date),
          won: g.home_won,
        })),
      });
    }
  }
  return cases;
}

const KEYS = ["makePlayoffs", "winRound1", "winRound2", "winConference", "winCup"] as const;
function backtest(model: Model, cases: Case[], strengthSd: number) {
  let inside = 0;
  let total = 0;
  let absError = 0;
  const logScore = KEYS.map(() => 0);
  for (const c of cases) {
    const { odds } = simulateSeason(c.teams, c.remaining, {
      sims: SIMS,
      seed: c.season * 100 + c.cut,
      coefficients: model.coefficients,
      overtimeRate: OVERTIME_RATE,
      strengthSd,
      priorGames: model.walk.rating.priorGames,
    });
    for (const o of odds) {
      const f = c.final.get(o.abbrev)!;
      total++;
      if (f.points >= o.pointsP10 && f.points <= o.pointsP90) inside++;
      absError += Math.abs(f.points - o.pointsAvg);
      KEYS.forEach((k, i) => {
        // Floor at half a simulation so a 0% that happened isn't infinite.
        const p = Math.min(Math.max(o[k], 0.5 / SIMS), 1 - 0.5 / SIMS);
        logScore[i] -= Math.log(f.outcome[i] ? p : 1 - p);
      });
    }
  }
  return { coverage: inside / total, mae: absError / total, logScore: logScore.map((s) => s / total), sum: logScore.reduce((a, b) => a + b) / total };
}

const show = (label: string, r: ReturnType<typeof backtest>) =>
  console.log(
    `  ${label.padEnd(28)} range ${(r.coverage * 100).toFixed(1)}%  error ${r.mae.toFixed(2)} pts  log loss: playoffs ${r.logScore[0].toFixed(4)}, 2nd rd ${r.logScore[1].toFixed(4)}, conf. final ${r.logScore[2].toFixed(4)}, final ${r.logScore[3].toFixed(4)}, Cup ${r.logScore[4].toFixed(4)}; sum ${r.sum.toFixed(4)}`,
  );

const current = await buildCases(CURRENT);
const previous = await buildCases(PREVIOUS);
await client.end();

// 1. Does a rating's edge fade for games further out? Fit the strength
// gap's coefficient separately for each horizon bucket.
const BUCKETS = [0, 15, 30, 60, 90, 120, 999];
const later = current.flatMap((c) => c.later);
const beta = fit(
  later.map((l) => {
    const b = BUCKETS.findIndex((edge, i) => l.daysAhead >= edge && l.daysAhead < BUCKETS[i + 1]);
    return { x: [1, l.rest, ...BUCKETS.slice(0, -1).map((_, i) => (i === b ? l.z : 0))], n: 1, wins: l.won ? 1 : 0 };
  }),
);
console.log(`${later.length} games after the cuts. Share of the rating's edge left (1 = as for the next two weeks):`);
BUCKETS.slice(0, -1).forEach((edge, i) => {
  const n = later.filter((l) => l.daysAhead >= edge && l.daysAhead < BUCKETS[i + 1]).length;
  console.log(`  ${String(edge).padStart(3)}-${BUCKETS[i + 1] === 999 ? "end" : String(BUCKETS[i + 1] - 1).padEnd(3)} days: ${(beta[i + 2] / beta[2]).toFixed(2)}  (${n} games)`);
});

// 2. Season odds against what happened, by STRENGTH_SD.
console.log(`\n${current.length} replays (${SEASONS.length} seasons x ${CUTS.length} cuts), ${SIMS} sims each:`);
const results: { sd: number; sum: number }[] = [];
for (const sd of [0, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4]) {
  const r = backtest(CURRENT, current, sd);
  show(`SD ${sd}`, r);
  results.push({ sd, sum: r.sum });
}
const best = results.reduce((a, b) => (b.sum < a.sum ? b : a));
console.log(`\nBest by summed log loss: SD ${best.sd} (STRENGTH_SD is ${STRENGTH_SD}). By cut, at STRENGTH_SD:`);
for (const cut of CUTS) show(`from ~${cut} games`, backtest(CURRENT, current.filter((c) => c.cut === cut), STRENGTH_SD));

// 3. Against the previous model, both at their STRENGTH_SD.
console.log("\nCurrent vs previous model:");
show(`${CURRENT.label}, SD ${STRENGTH_SD}`, backtest(CURRENT, current, STRENGTH_SD));
show(`${PREVIOUS.label}, SD 0.26`, backtest(PREVIOUS, previous, 0.26));
for (const cut of CUTS) {
  show(`  current, from ~${cut}`, backtest(CURRENT, current.filter((c) => c.cut === cut), STRENGTH_SD));
  show(`  previous, from ~${cut}`, backtest(PREVIOUS, previous.filter((c) => c.cut === cut), 0.26));
}

// 4. Make-playoffs odds in detail: calibration, accuracy and baselines.
// "Standings only" plays the rest of the season with every team equal, so
// it knows the standings and schedule but nothing about team strength.
const STANDINGS_ONLY: Model = { ...CURRENT, label: "standings only", coefficients: [PREGAME_COEFFICIENTS[0], 0, 0, 0, 0, 0] };
function playoffPredictions(model: Model, cases: Case[], strengthSd: number) {
  return cases.flatMap((c) => {
    const { odds } = simulateSeason(c.teams, c.remaining, {
      sims: SIMS,
      seed: c.season * 100 + c.cut,
      coefficients: model.coefficients,
      overtimeRate: OVERTIME_RATE,
      strengthSd,
      priorGames: model.walk.rating.priorGames,
    });
    return odds.map((o) => ({ season: c.season, cut: c.cut, team: o.abbrev, p: o.makePlayoffs, made: c.final.get(o.abbrev)!.outcome[0] === 1 }));
  });
}
const brier = (ps: { p: number; made: boolean }[]) => ps.reduce((s, x) => s + (x.p - Number(x.made)) ** 2, 0) / ps.length;
// Picks the 16 likeliest teams per replay and counts how many made it.
const hits = (ps: ReturnType<typeof playoffPredictions>) => {
  let right = 0;
  const groups = new Map<string, typeof ps>();
  for (const x of ps) groups.set(`${x.season}:${x.cut}`, [...(groups.get(`${x.season}:${x.cut}`) ?? []), x]);
  for (const g of groups.values()) right += [...g].sort((a, b) => b.p - a.p).slice(0, 16).filter((x) => x.made).length;
  return right / (groups.size * 16);
};
const runs = [
  { label: "current model", ps: playoffPredictions(CURRENT, current, STRENGTH_SD) },
  { label: "previous model", ps: playoffPredictions(PREVIOUS, previous, 0.26) },
  { label: "standings only", ps: playoffPredictions(STANDINGS_ONLY, current, 0) },
];
console.log("\nMake playoffs: Brier score (lower is better; always saying 50% scores 0.25) and share of the 16 likeliest teams that made it");
console.log(`  ${"".padEnd(16)} ${CUTS.map((c) => `from ~${c} games`.padEnd(22)).join("")}all`);
for (const r of runs) {
  const cells = CUTS.map((cut) => {
    const ps = r.ps.filter((x) => x.cut === cut);
    return `${brier(ps).toFixed(3)} / ${(hits(ps) * 100).toFixed(0)}%`.padEnd(22);
  });
  console.log(`  ${r.label.padEnd(16)} ${cells.join("")}${brier(r.ps).toFixed(3)} / ${(hits(r.ps) * 100).toFixed(0)}%`);
}
console.log("\nCalibration, current model (all cuts): when we said X%, how often did teams make it?");
for (const [lo, hi] of [[0, 0.05], [0.05, 0.2], [0.2, 0.4], [0.4, 0.6], [0.6, 0.8], [0.8, 0.95], [0.95, 1.01]]) {
  const ps = runs[0].ps.filter((x) => x.p >= lo && x.p < hi);
  if (!ps.length) continue;
  const said = ps.reduce((s, x) => s + x.p, 0) / ps.length;
  const made = ps.filter((x) => x.made).length / ps.length;
  console.log(`  ${`${(lo * 100).toFixed(0)}-${(Math.min(hi, 1) * 100).toFixed(0)}%`.padEnd(8)} said ${(said * 100).toFixed(1).padStart(5)}%  made ${(made * 100).toFixed(1).padStart(5)}%  (${ps.length} team-replays)`);
}
console.log("\nBy season, current model (Brier, all cuts):");
console.log("  " + SEASONS.map((s) => `${s}-${String(s + 1).slice(2)} ${brier(runs[0].ps.filter((x) => x.season === s)).toFixed(3)}`).join("  "));
console.log("\nBiggest misses, current model from ~20 games (said < 25% and made it, or > 75% and missed):");
for (const x of runs[0].ps.filter((x) => x.cut === 20 && ((x.p < 0.25 && x.made) || (x.p > 0.75 && !x.made))).sort((a, b) => Math.abs(Number(b.made) - b.p) - Math.abs(Number(a.made) - a.p)).slice(0, 10)) {
  console.log(`  ${x.season}-${String(x.season + 1).slice(2)} ${x.team} ${(x.p * 100).toFixed(0)}% → ${x.made ? "made it" : "missed"}`);
}
