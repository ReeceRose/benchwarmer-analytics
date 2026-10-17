// Fits the pregame win probability model (team ratings → home win chance)
// and writes src/server/projections/pregame-model.ts.
//
//   npx tsx scripts/fit-pregame-model.ts [--write]
//
// Walks every regular season game by game, rating both teams on what was
// known before it (projections/history.ts), so the fit sees only what was
// known at puck drop. Fitted on 2010-2024, checked on 2025. Read-only.
import { writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { config } from "dotenv";
import pg from "pg";
import type { GoalieParams } from "@/server/projections/goalies";
import { loadHistory, walk, type PregameSample, type WalkParams } from "@/server/projections/history";
import { evaluate, fit } from "@/server/projections/logistic-fit";
import { pregameFeatures } from "@/lib/projections/ratings";
import type { RosterParams } from "@/server/projections/roster";

config({ path: [".env.local", "../.env.local"], quiet: true });

const { values } = parseArgs({ options: { write: { type: "boolean", default: false } } });
// 2008 is only a prior; 2009 lacks two earlier seasons for roster talent.
const FIRST = 2008;
const FIRST_FIT = 2010;
const TEST_SEASON = 2025;

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const client = new pg.Client({ connectionString: url, options: "-c default_transaction_read_only=on" });
await client.connect();
const history = await loadHistory(client, FIRST, TEST_SEASON);
console.log(`${history.games.length} games, ${FIRST}-${TEST_SEASON}`);

interface Sample {
  season: number;
  x: number[];
  won: boolean;
  /** Fewer games played of the two teams. */
  early: boolean;
}

/** Features with the switched-off ones zeroed, so ablations keep the same shape. */
const MASKS = {
  "team stats only (old model)": [1, 1, 1, 0, 0, 0],
  "+ rest": [1, 1, 1, 0, 0, 1],
  "+ goaltending": [1, 1, 1, 0, 1, 0],
  "+ roster": [1, 1, 1, 1, 0, 0],
  "all": [1, 1, 1, 1, 1, 1],
};

const toSamples = (s: PregameSample[], mask = MASKS.all): Sample[] =>
  s
    .filter((p) => p.game.season >= FIRST_FIT)
    .map((p) => ({ season: p.game.season, x: pregameFeatures(p.home, p.away, p.rest).map((v, i) => v * mask[i]), won: p.game.home_won, early: Math.min(p.home.gamesPlayed, p.away.gamesPlayed) < 20 }));

const logLoss = (beta: number[], data: Sample[]) =>
  data.reduce((s, d) => {
    const p = 1 / (1 + Math.exp(-d.x.reduce((t, v, i) => t + v * beta[i], 0)));
    return s - Math.log(d.won ? p : 1 - p);
  }, 0) / data.length;

const fitSamples = (data: Sample[]) => fit(data.map((s) => ({ x: s.x, n: 1, wins: s.won ? 1 : 0 })));

async function score(params: WalkParams, mask = MASKS.all) {
  const all = toSamples(await walk(history, params), mask);
  const train = all.filter((s) => s.season < TEST_SEASON);
  const beta = fitSamples(train);
  return { beta, train: logLoss(beta, train), test: logLoss(beta, all.filter((s) => s.season === TEST_SEASON)), all };
}

// Coordinate search, each stage on training log loss: goaltending, then
// roster, then the team-stat blend, then goaltending once more.
let params: WalkParams = {
  rating: { priorGames: 40, carryOver: 0.5, rosterGames: 20 },
  goalie: { decay: 0.7, shrinkXg: 60 },
  roster: { shrinkHours: 20 },
};
let bestLoss = (await score(params)).train;
async function tryAll(label: string, candidates: WalkParams[]) {
  for (const c of candidates) {
    const { train } = await score(c);
    if (train < bestLoss) {
      bestLoss = train;
      params = c;
    }
  }
  console.log(`${label}: ${JSON.stringify(params)} train log loss ${bestLoss.toFixed(5)}`);
}
const goalieGrid = () =>
  [0.5, 0.7, 0.85, 1].flatMap((decay) => [20, 40, 60, 100, 160].map((shrinkXg): GoalieParams => ({ decay, shrinkXg }))).map((goalie) => ({ ...params, goalie }));
await tryAll("Goaltending", goalieGrid());
await tryAll(
  "Roster",
  [5, 10, 20, 40].flatMap((shrinkHours): WalkParams[] =>
    [10, 20, 40, 80, 160].map((rosterGames) => ({ ...params, roster: { shrinkHours } satisfies RosterParams, rating: { ...params.rating, rosterGames } })),
  ),
);
await tryAll(
  "Team stats",
  [10, 20, 40, 60, 80].flatMap((priorGames): WalkParams[] =>
    [0, 0.2, 0.35, 0.5, 0.7].map((carryOver) => ({ ...params, rating: { ...params.rating, priorGames, carryOver } })),
  ),
);
await tryAll("Goaltending again", goalieGrid());

const final = await score(params);
const { beta } = final;
const test = final.all.filter((s) => s.season === TEST_SEASON);
const homeOnly = fitSamples(final.all.filter((s) => s.season < TEST_SEASON).map((s) => ({ ...s, x: [1] })));
console.log(`\nCoefficients: ${["home ice", "xG gap", "goal gap", "roster gap", "goaltending gap", "rest"].map((n, i) => `${n} ${beta[i].toFixed(4)}`).join(", ")}`);
console.log(`\n${TEST_SEASON} log loss (lower is better), each fitted on 2010-2024:`);
console.log(`  home ice only                ${logLoss(homeOnly, test.map((s) => ({ ...s, x: [1] }))).toFixed(5)}`);
const ablations: [string, Sample[]][] = [];
for (const [label, mask] of Object.entries(MASKS)) {
  const s = await score(params, mask);
  ablations.push([label, s.all]);
  console.log(`  ${label.padEnd(28)} ${s.test.toFixed(5)}`);
}
// One season is ~1,300 games, too few to separate features worth ~0.001 of
// log loss, so also hold out each season in turn.
console.log(`\nLeave one season out, ${FIRST_FIT}-${TEST_SEASON} (mean log loss; gain vs the old model x1000):`);
let baseline = [0, 0];
for (const [label, all] of ablations) {
  const total = [0, 0];
  const count = [0, 0];
  for (let season = FIRST_FIT; season <= TEST_SEASON; season++) {
    const beta = fitSamples(all.filter((s) => s.season !== season));
    for (const s of all.filter((s) => s.season === season)) {
      const loss = logLoss(beta, [s]);
      total[0] += loss;
      count[0]++;
      if (s.early) {
        total[1] += loss;
        count[1]++;
      }
    }
  }
  const mean = total.map((t, i) => t / count[i]);
  if (!baseline[0]) baseline = mean;
  const gain = (i: number) => ((baseline[i] - mean[i]) * 1000).toFixed(2).padStart(6);
  console.log(`  ${label.padEnd(28)} all ${mean[0].toFixed(5)} ${gain(0)}   first 20 games (${count[1]}) ${mean[1].toFixed(5)} ${gain(1)}`);
}
const predict = (x: number[]) => 1 / (1 + Math.exp(-x.reduce((t, v, i) => t + v * beta[i], 0)));
evaluate(`Test ${TEST_SEASON}`, test.map((s) => ({ p: predict(s.x), n: 1, wins: s.won ? 1 : 0 })));

// Experimental injury model: the weight on how much better the actual
// starting goalie is than the team's usual goaltending, fitted on top of the
// main model (its logit as a fixed offset), so the two agree when nobody's hurt.
const walked = (await walk(history, params)).filter((p) => p.game.season >= FIRST_FIT);
const gapRows = walked.map((p) => ({
  season: p.game.season,
  offset: pregameFeatures(p.home, p.away, p.rest).reduce((t, v, i) => t + v * beta[i], 0),
  gap: p.starterGap.home - p.starterGap.away,
  won: p.game.home_won,
}));
function fitGap(rows: typeof gapRows) {
  let c = 0;
  for (let iter = 0; iter < 30; iter++) {
    let grad = 0;
    let hess = 1e-6;
    for (const r of rows) {
      const p = 1 / (1 + Math.exp(-(r.offset + c * r.gap)));
      grad += r.gap * (Number(r.won) - p);
      hess += p * (1 - p) * r.gap * r.gap;
    }
    c += grad / hess;
  }
  return c;
}
const gapLoss = (c: number, rows: typeof gapRows) =>
  rows.reduce((s, r) => s - Math.log(1 / (1 + Math.exp(r.won ? -(r.offset + c * r.gap) : r.offset + c * r.gap))), 0);
let withGap = 0;
let withoutGap = 0;
for (let season = FIRST_FIT; season <= TEST_SEASON; season++) {
  const held = gapRows.filter((r) => r.season === season);
  withGap += gapLoss(fitGap(gapRows.filter((r) => r.season !== season)), held);
  withoutGap += gapLoss(0, held);
}
const starterGap = fitGap(gapRows.filter((r) => r.season < TEST_SEASON));
console.log(
  `\nExperimental starter-gap weight ${starterGap.toFixed(4)} per goal; knowing the actual starter, leave one season out: log loss ${(withoutGap / gapRows.length).toFixed(5)} → ${(withGap / gapRows.length).toFixed(5)}`,
);

const games = history.games.filter((g) => g.season >= 2015 && g.season < TEST_SEASON);
const ot = games.filter((g) => g.went_to_ot).length / games.length;
console.log(`\nShare of games to overtime (2015-2024): ${(ot * 100).toFixed(1)}%`);
await client.end();

const r = params.rating;
const source = `// Generated by scripts/fit-pregame-model.ts from ${final.all.length - test.length} regular-season
// games (${FIRST_FIT}-${TEST_SEASON - 1}). Don't edit by hand. Features: pregameFeatures in ratings.ts.
import type { GoalieParams } from "@/server/projections/goalies";
import type { RatingParams } from "@/lib/projections/ratings";
import type { RosterParams } from "@/server/projections/roster";

export const RATING_PARAMS: RatingParams = { priorGames: ${r.priorGames}, carryOver: ${r.carryOver}, rosterGames: ${r.rosterGames} };
export const GOALIE_PARAMS: GoalieParams = { decay: ${params.goalie.decay}, shrinkXg: ${params.goalie.shrinkXg} };
export const ROSTER_PARAMS: RosterParams = { shrinkHours: ${params.roster.shrinkHours} };
/** Home ice, xG gap, goal gap, roster gap, goaltending gap, rest. */
export const PREGAME_COEFFICIENTS = [${beta.map((b) => Number(b.toPrecision(6))).join(", ")}];
/** Share of regular-season games decided in overtime or a shootout. */
export const OVERTIME_RATE = ${Number(ot.toPrecision(4))};
/**
 * Experimental injury model (projections/injuries.ts): logit per goal per game
 * by which the expected starting goalie beats the team's usual goaltending.
 */
export const STARTER_GAP_COEFFICIENT = ${Number(starterGap.toPrecision(6))};
`;
if (values.write) {
  writeFileSync(new URL("../src/server/projections/pregame-model.ts", import.meta.url), source);
  console.log("\nWrote src/server/projections/pregame-model.ts");
} else {
  console.log(`\n${source}\nRun with --write to save.`);
}
