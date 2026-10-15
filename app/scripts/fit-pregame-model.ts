// Fits the pregame win probability model (team ratings → home win chance)
// and writes src/server/projections/pregame-model.ts.
//
//   npx tsx scripts/fit-pregame-model.ts [--write]
//
// Walks every regular season game by game, rating both teams on the games
// they'd played *before* it (blended with last season), so the fit sees only
// what was known at puck drop. Fitted on 2010-2024, checked on 2025. Read-only.
import { writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { config } from "dotenv";
import pg from "pg";
import { RatingTable, pregameFeatures, type Rating, type RatingParams } from "@/server/projections/ratings";
import { evaluate, fit } from "@/server/projections/logistic-fit";

config({ path: [".env.local", "../.env.local"], quiet: true });

const { values } = parseArgs({ options: { write: { type: "boolean", default: false } } });
const FIRST = 2009;
const TEST_SEASON = 2025;

interface Row {
  season: number;
  game_id: string;
  game_date: string;
  home: string;
  away: string;
  home_won: boolean;
  went_to_ot: boolean;
  h_xgf: number; h_xga: number; h_gf: number; h_ga: number;
  a_xgf: number; a_xga: number; a_gf: number; a_ga: number;
}

// One row per regular-season game: both teams' stats and the result.
const SQL = `
select g.season, g.game_id, g.game_date::text, g.home_team_code as home, g.away_team_code as away,
  g.home_score > g.away_score as home_won, coalesce(g.period_type, 'REG') <> 'REG' as went_to_ot,
  h5.score_venue_adjusted_x_goals_for::float8 as h_xgf, h5.score_venue_adjusted_x_goals_against::float8 as h_xga,
  ha.goals_for::float8 as h_gf, ha.goals_against::float8 as h_ga,
  a5.score_venue_adjusted_x_goals_for::float8 as a_xgf, a5.score_venue_adjusted_x_goals_against::float8 as a_xga,
  aa.goals_for::float8 as a_gf, aa.goals_against::float8 as a_ga
from games g
join team_games h5 on h5.game_id = g.game_id and h5.team_abbreviation = g.home_team_code and h5.situation = '5on5'
join team_games ha on ha.game_id = g.game_id and ha.team_abbreviation = g.home_team_code and ha.situation = 'all'
join team_games a5 on a5.game_id = g.game_id and a5.team_abbreviation = g.away_team_code and a5.situation = '5on5'
join team_games aa on aa.game_id = g.game_id and aa.team_abbreviation = g.away_team_code and aa.situation = 'all'
where g.game_type = 2 and g.game_state in ('OFF', 'FINAL') and g.season between ${FIRST} and ${TEST_SEASON}
order by g.game_date, g.game_id`;

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const client = new pg.Client({ connectionString: url, options: "-c default_transaction_read_only=on" });
await client.connect();
const { rows } = await client.query<Row>(SQL);
await client.end();
console.log(`${rows.length} games, ${FIRST}-${TEST_SEASON}`);
const otRate = (season: (s: number) => boolean) => {
  const r = rows.filter((g) => season(g.season));
  return r.filter((g) => g.went_to_ot).length / r.length;
};

const bySeason = new Map<number, Row[]>();
for (const r of rows) {
  const list = bySeason.get(r.season) ?? [];
  list.push(r);
  bySeason.set(r.season, list);
}

// Pregame features for every game, from ratings as they stood before it.
function samples(params: RatingParams) {
  const out: { season: number; x: number[]; won: boolean }[] = [];
  let prior = new Map<string, Rating>();
  for (const season of [...bySeason.keys()].sort()) {
    const table = new RatingTable();
    for (const g of bySeason.get(season)!) {
      const home = table.rating(g.home, prior.get(g.home), params);
      const away = table.rating(g.away, prior.get(g.away), params);
      if (season > FIRST) out.push({ season, x: pregameFeatures(home, away), won: g.home_won });
      table.add({ team: g.home, xgf: g.h_xgf, xga: g.h_xga, gf: g.h_gf, ga: g.h_ga });
      table.add({ team: g.away, xgf: g.a_xgf, xga: g.a_xga, gf: g.a_gf, ga: g.a_ga });
    }
    prior = table.averages();
  }
  return out;
}

const logLoss = (beta: number[], data: { x: number[]; won: boolean }[]) =>
  data.reduce((s, d) => {
    const p = 1 / (1 + Math.exp(-d.x.reduce((t, v, i) => t + v * beta[i], 0)));
    return s - Math.log(d.won ? p : 1 - p);
  }, 0) / data.length;

// Grid search the rating blend; logistic fit for each; keep the best on the
// training seasons (the test season is only for the final check).
let best: { params: RatingParams; beta: number[]; train: number } | null = null;
for (const priorGames of [10, 20, 40, 60, 80, 120]) {
  for (const carryOver of [0.3, 0.4, 0.5, 0.6, 0.7]) {
    const params = { priorGames, carryOver };
    const train = samples(params).filter((s) => s.season < TEST_SEASON);
    const beta = fit(train.map((s) => ({ x: s.x, n: 1, wins: s.won ? 1 : 0 })));
    const loss = logLoss(beta, train);
    if (!best || loss < best.train) best = { params, beta, train: loss };
  }
}
const { params, beta } = best!;
const all = samples(params);
const train = all.filter((s) => s.season < TEST_SEASON);
const test = all.filter((s) => s.season === TEST_SEASON);
const homeOnly = fit(train.map((s) => ({ x: [1], n: 1, wins: s.won ? 1 : 0 })));
console.log(`Best blend: prior counts as ${params.priorGames} games, carry-over ${params.carryOver}`);
console.log(`Coefficients: home ice ${beta[0].toFixed(4)}, xG gap ${beta[1].toFixed(4)}, goal gap ${beta[2].toFixed(4)}`);
console.log(`Test ${TEST_SEASON} log loss: model ${logLoss(beta, test).toFixed(4)}, home ice only ${logLoss(homeOnly, test.map((s) => ({ ...s, x: [1] }))).toFixed(4)}`);
const predict = (x: number[]) => 1 / (1 + Math.exp(-x.reduce((t, v, i) => t + v * beta[i], 0)));
evaluate(`Test ${TEST_SEASON}`, test.map((s) => ({ p: predict(s.x), n: 1, wins: s.won ? 1 : 0 })));
const ot = otRate((s) => s >= 2015 && s < TEST_SEASON);
console.log(`\nShare of games to overtime (2015-2024): ${(ot * 100).toFixed(1)}%`);

const source = `// Generated by scripts/fit-pregame-model.ts from ${train.length} regular-season
// games (2010-2024). Don't edit by hand. Features: pregameFeatures in ratings.ts.
import type { RatingParams } from "@/server/projections/ratings";

export const RATING_PARAMS: RatingParams = { priorGames: ${params.priorGames}, carryOver: ${params.carryOver} };
export const PREGAME_COEFFICIENTS = [${beta.map((b) => Number(b.toPrecision(6))).join(", ")}];
/** Share of regular-season games decided in overtime or a shootout. */
export const OVERTIME_RATE = ${Number(ot.toPrecision(4))};
`;
if (values.write) {
  writeFileSync(new URL("../src/server/projections/pregame-model.ts", import.meta.url), source);
  console.log("\nWrote src/server/projections/pregame-model.ts");
} else {
  console.log(`\n${source}\nRun with --write to save.`);
}
